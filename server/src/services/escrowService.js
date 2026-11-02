/**
 * Escrow state machine (the unique CampusGigs feature)
 *
 *   open ──accept bid (coins locked)──▶ in_progress ──deliver──▶ delivered ──confirm──▶ completed
 *                                          ▲                         │
 *                                          └───── request revision ──┘
 *   in_progress/delivered ──freelancer withdraws──▶ open  (poster refunded in full)
 *   open ──poster cancels──▶ cancelled
 *
 * Every function runs in one DB transaction with row locks so coins can never
 * be created, lost or double-spent.
 */
const env = require('../config/env');
const { withTx } = require('../config/db');
const { HttpError } = require('../utils/httpError');
const { XP_REWARDS } = require('../utils/levels');
const { applyTx, addXp, ref } = require('./walletService');

async function lockGig(client, gigId) {
  const { rows } = await client.query('SELECT * FROM gigs WHERE id=$1 FOR UPDATE', [gigId]);
  if (!rows[0]) throw new HttpError(404, 'Gig not found');
  return rows[0];
}

/** Poster picks a bid -> bid amount is moved from poster wallet into escrow. */
const acceptBid = (userId, bidId) =>
  withTx(async (client) => {
    const found = await client.query('SELECT gig_id FROM bids WHERE id=$1', [bidId]);
    if (!found.rows[0]) throw new HttpError(404, 'Bid not found');
    const gig = await lockGig(client, found.rows[0].gig_id);
    const { rows } = await client.query('SELECT * FROM bids WHERE id=$1 FOR UPDATE', [bidId]);
    const bid = rows[0];

    if (gig.poster_id !== userId) throw new HttpError(403, 'Only the gig owner can accept a bid');
    if (gig.status !== 'open') throw new HttpError(409, 'This gig is no longer open');
    if (bid.status !== 'pending') throw new HttpError(409, 'This bid is no longer available');

    await applyTx(client, {
      userId,
      amount: -bid.amount,
      type: 'escrow_hold',
      gigId: gig.id,
      label: `Held in escrow: ${gig.title}`,
      reference: ref('ESC'),
    });

    await client.query(
      `UPDATE gigs SET status='in_progress', assigned_to=$2, accepted_bid_id=$3, escrow_amount=$4,
              delivery_note=NULL, revision_note=NULL, delivered_at=NULL WHERE id=$1`,
      [gig.id, bid.bidder_id, bid.id, bid.amount]
    );
    await client.query(`UPDATE bids SET status='accepted' WHERE id=$1`, [bid.id]);
    await client.query(
      `UPDATE bids SET status='rejected' WHERE gig_id=$1 AND id<>$2 AND status='pending'`,
      [gig.id, bid.id]
    );
    return { gigId: gig.id, held: bid.amount };
  });

/** Freelancer submits the work. */
const deliver = (userId, gigId, note) =>
  withTx(async (client) => {
    const gig = await lockGig(client, gigId);
    if (gig.assigned_to !== userId) throw new HttpError(403, 'Only the assigned freelancer can deliver');
    if (gig.status !== 'in_progress') throw new HttpError(409, 'This gig is not waiting for delivery');
    await client.query(
      `UPDATE gigs SET status='delivered', delivery_note=$2, delivered_at=now(), revision_note=NULL WHERE id=$1`,
      [gigId, note]
    );
    return { gigId };
  });

/** Poster is not happy yet: sends it back to the freelancer, coins stay locked. */
const requestRevision = (userId, gigId, note) =>
  withTx(async (client) => {
    const gig = await lockGig(client, gigId);
    if (gig.poster_id !== userId) throw new HttpError(403, 'Only the gig owner can request a revision');
    if (gig.status !== 'delivered') throw new HttpError(409, 'Nothing has been delivered yet');
    await client.query(`UPDATE gigs SET status='in_progress', revision_note=$2 WHERE id=$1`, [gigId, note]);
    return { gigId };
  });

/** Poster is happy -> escrow released to the freelancer (minus optional platform fee). */
const confirm = (userId, gigId) =>
  withTx(async (client) => {
    const gig = await lockGig(client, gigId);
    if (gig.poster_id !== userId) throw new HttpError(403, 'Only the gig owner can release the payment');
    if (gig.status !== 'delivered') throw new HttpError(409, 'The freelancer has not delivered yet');

    const fee = Math.floor((gig.escrow_amount * env.feePercent) / 100);
    const net = gig.escrow_amount - fee;

    await applyTx(client, {
      userId: gig.assigned_to,
      amount: net,
      type: 'escrow_release',
      gigId: gig.id,
      label: fee ? `Payment released: ${gig.title} (fee ${fee})` : `Payment released: ${gig.title}`,
      reference: ref('REL'),
    });
    await client.query(
      `UPDATE gigs SET status='completed', fee_amount=$2, completed_at=now() WHERE id=$1`,
      [gig.id, fee]
    );
    await addXp(client, gig.assigned_to, XP_REWARDS.completeAsWorker);
    await addXp(client, gig.poster_id, XP_REWARDS.completeAsPoster);
    return { gigId: gig.id, released: net, fee, xp: { worker: XP_REWARDS.completeAsWorker, poster: XP_REWARDS.completeAsPoster } };
  });

/** Freelancer backs out -> poster is refunded in full and the gig reopens. */
const workerWithdraw = (userId, gigId) =>
  withTx(async (client) => {
    const gig = await lockGig(client, gigId);
    if (gig.assigned_to !== userId) throw new HttpError(403, 'You are not assigned to this gig');
    if (!['in_progress', 'delivered'].includes(gig.status)) throw new HttpError(409, 'This gig cannot be left now');

    await applyTx(client, {
      userId: gig.poster_id,
      amount: gig.escrow_amount,
      type: 'refund',
      gigId: gig.id,
      label: `Escrow refunded: ${gig.title}`,
      reference: ref('REF'),
    });
    await client.query(`UPDATE bids SET status='withdrawn' WHERE id=$1`, [gig.accepted_bid_id]);
    await client.query(
      `UPDATE gigs SET status='open', assigned_to=NULL, accepted_bid_id=NULL, escrow_amount=0,
              delivery_note=NULL, revision_note=NULL, delivered_at=NULL WHERE id=$1`,
      [gig.id]
    );
    return { gigId: gig.id, refunded: gig.escrow_amount };
  });

/** Poster cancels a gig that has no escrow yet. */
const cancelOpenGig = (userId, gigId) =>
  withTx(async (client) => {
    const gig = await lockGig(client, gigId);
    if (gig.poster_id !== userId) throw new HttpError(403, 'Only the gig owner can cancel');
    if (gig.status !== 'open') {
      throw new HttpError(409, 'Only open gigs can be cancelled. Ask the freelancer to withdraw instead');
    }
    await client.query(`UPDATE gigs SET status='cancelled' WHERE id=$1`, [gigId]);
    await client.query(`UPDATE bids SET status='rejected' WHERE gig_id=$1 AND status='pending'`, [gigId]);
    return { gigId };
  });

module.exports = { acceptBid, deliver, requestRevision, confirm, workerWithdraw, cancelOpenGig };
