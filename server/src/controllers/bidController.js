const { query } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/httpError');
const { mapBid, mapGig } = require('../utils/mappers');
const escrow = require('../services/escrowService');

exports.place = asyncHandler(async (req, res) => {
  const gigId = Number(req.params.id);
  const amount = Number(req.body.amount);
  const message = String(req.body.message || '').trim().slice(0, 500);
  const days = req.body.deliveryDays === '' || req.body.deliveryDays == null ? null : Number(req.body.deliveryDays);

  const g = await query('SELECT * FROM gigs WHERE id=$1', [gigId]);
  const gig = g.rows[0];
  if (!gig) throw new HttpError(404, 'Gig not found');
  if (gig.poster_id === req.user.id) throw new HttpError(400, "You can't bid on your own gig");
  if (gig.status !== 'open') throw new HttpError(409, 'This gig is no longer accepting bids');
  if (!Number.isInteger(amount) || amount < 1) throw new HttpError(400, 'Enter your bid as a whole number of GigCoins');
  if (amount > gig.budget) throw new HttpError(400, `Your bid can't be higher than the budget (${gig.budget} GigCoins)`);
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 365)) throw new HttpError(400, 'Delivery days must be between 1 and 365');

  const { rows } = await query(
    `INSERT INTO bids (gig_id, bidder_id, amount, message, delivery_days)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (gig_id, bidder_id) DO UPDATE
       SET amount=EXCLUDED.amount, message=EXCLUDED.message, delivery_days=EXCLUDED.delivery_days,
           status='pending', created_at=now()
       WHERE bids.status <> 'accepted'
     RETURNING *`,
    [gigId, req.user.id, amount, message, days]
  );
  if (!rows[0]) throw new HttpError(409, 'Your bid was already accepted');
  res.status(201).json({ bid: mapBid(rows[0]) });
});

exports.withdraw = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE bids SET status='withdrawn' WHERE id=$1 AND bidder_id=$2 AND status='pending' RETURNING id`,
    [Number(req.params.id), req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'No pending bid found to withdraw');
  res.json({ message: 'Bid withdrawn' });
});

exports.mine = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT b.*, g.title, g.status AS gig_status, g.budget, g.category, g.assigned_to, g.poster_id,
            p.name AS poster_name
       FROM bids b JOIN gigs g ON g.id=b.gig_id JOIN users p ON p.id=g.poster_id
      WHERE b.bidder_id=$1 ORDER BY b.created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({
    bids: rows.map((r) =>
      mapBid(r, { gig: { id: r.gig_id, title: r.title, status: r.gig_status, budget: r.budget, category: r.category, posterName: r.poster_name } })
    ),
  });
});

exports.accept = asyncHandler(async (req, res) => {
  const out = await escrow.acceptBid(req.user.id, Number(req.params.id));
  res.json({ message: `${out.held} GigCoins are now held safely in escrow`, ...out });
});
