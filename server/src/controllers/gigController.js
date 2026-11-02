const { query, withTx } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/httpError');
const { mapGig, mapBid, miniUser } = require('../utils/mappers');
const { XP_REWARDS } = require('../utils/levels');
const { addXp } = require('../services/walletService');
const escrow = require('../services/escrowService');
const { saveDataUrl } = require('../services/storage');

const CATEGORIES = ['Design', 'Development', 'Writing', 'Tutoring', 'Video & Photo', 'Marketing', 'Data & Research', 'Errands', 'Other'];
exports.CATEGORIES = CATEGORIES;

const SORTS = {
  newest: 'g.created_at DESC',
  budget_high: 'g.budget DESC, g.created_at DESC',
  budget_low: 'g.budget ASC, g.created_at DESC',
  deadline: 'g.deadline ASC NULLS LAST, g.created_at DESC',
};

function validateGig(b) {
  const title = String(b.title || '').trim();
  const description = String(b.description || '').trim();
  const category = String(b.category || '');
  const budget = Number(b.budget);
  let deadline = b.deadline ? String(b.deadline).slice(0, 10) : null;

  if (title.length < 5 || title.length > 140) throw new HttpError(400, 'Title must be 5 to 140 characters');
  if (description.length < 10) throw new HttpError(400, 'Please describe the gig in at least 10 characters');
  if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Please choose a category');
  if (!Number.isInteger(budget) || budget < 10 || budget > 100000) {
    throw new HttpError(400, 'Budget must be a whole number between 10 and 100000 GigCoins');
  }
  if (deadline) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline))) throw new HttpError(400, 'Deadline is not a valid date');
  } else deadline = null;
  return { title, description, category, budget, deadline };
}

const GIG_LIST_SQL = `
  SELECT g.*,
    p.id AS poster_id, p.name AS poster_name, p.avatar AS poster_avatar, p.xp AS poster_xp,
    (SELECT count(*) FROM bids b WHERE b.gig_id=g.id AND b.status IN ('pending','accepted'))::int AS bid_count,
    mb.amount AS my_bid_amount, mb.status AS my_bid_status
  FROM gigs g
  JOIN users p ON p.id = g.poster_id
  LEFT JOIN bids mb ON mb.gig_id = g.id AND mb.bidder_id = $1`;

exports.list = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { q, category, scope = 'explore', sort = 'newest' } = req.query;
  const where = [];
  const params = [me];

  if (scope === 'posted') where.push('g.poster_id = $1');
  else if (scope === 'working') where.push(`g.assigned_to = $1 AND g.status IN ('in_progress','delivered')`);
  else where.push(`g.status = 'open'`);

  if (q) {
    params.push(`%${String(q).trim()}%`);
    where.push(`(g.title ILIKE $${params.length} OR g.description ILIKE $${params.length})`);
  }
  if (category && category !== 'All') {
    params.push(String(category));
    where.push(`g.category = $${params.length}`);
  }
  const order = SORTS[sort] || SORTS.newest;
  const { rows } = await query(`${GIG_LIST_SQL} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 100`, params);

  res.json({
    gigs: rows.map((r) =>
      mapGig(r, {
        poster: miniUser('poster', r),
        bidCount: r.bid_count,
        myBid: r.my_bid_amount ? { amount: r.my_bid_amount, status: r.my_bid_status } : null,
        isMine: r.poster_id === me,
      })
    ),
  });
});

exports.get = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const id = Number(req.params.id);
  const { rows } = await query(`${GIG_LIST_SQL} WHERE g.id = $2`, [me, id]);
  const g = rows[0];
  if (!g) throw new HttpError(404, 'Gig not found');

  const viewerRole = g.poster_id === me ? 'poster' : g.assigned_to === me ? 'worker' : 'visitor';
  const gig = mapGig(g, {
    poster: miniUser('poster', g),
    bidCount: g.bid_count,
    myBid: null,
    viewerRole,
  });

  if (g.assigned_to) {
    const w = await query('SELECT id, name, avatar, xp FROM users WHERE id=$1', [g.assigned_to]);
    gig.worker = miniUser('w', { w_id: w.rows[0].id, w_name: w.rows[0].name, w_avatar: w.rows[0].avatar, w_xp: w.rows[0].xp });
  }

  // Bids: owner sees everyone's; everyone else only sees their own.
  const bidSql = `SELECT b.*, u.name AS bidder_name, u.avatar AS bidder_avatar, u.xp AS bidder_xp,
        (SELECT count(*) FROM gigs cg WHERE cg.assigned_to=u.id AND cg.status='completed')::int AS bidder_done
      FROM bids b JOIN users u ON u.id=b.bidder_id
      WHERE b.gig_id=$1 ${viewerRole === 'poster' ? '' : 'AND b.bidder_id=$2'} ORDER BY b.amount ASC, b.created_at ASC`;
  const bids = await query(bidSql, viewerRole === 'poster' ? [id] : [id, me]);
  const mapped = bids.rows.map((b) => mapBid(b, { bidder: miniUser('bidder', b), bidderCompleted: b.bidder_done }));
  if (viewerRole === 'poster') gig.bids = mapped;
  else gig.myBid = mapped[0] || null;

  // Escrow ledger lines for this gig (only for the two parties)
  if (viewerRole !== 'visitor') {
    const tx = await query(
      `SELECT t.id, t.type, t.amount, t.label, t.reference, t.created_at, t.user_id
         FROM transactions t WHERE t.gig_id=$1 AND t.type IN ('escrow_hold','escrow_release','refund') ORDER BY t.id`,
      [id]
    );
    gig.ledger = tx.rows;
  }
  res.json({ gig });
});

exports.create = asyncHandler(async (req, res) => {
  const v = validateGig(req.body);
  const imageUrl = req.body.image ? await saveDataUrl(req.body.image, 'gigs') : null;
  const gig = await withTx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO gigs (poster_id, title, description, category, budget, deadline, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, v.title, v.description, v.category, v.budget, v.deadline, imageUrl]
    );
    await addXp(client, req.user.id, XP_REWARDS.postGig);
    return rows[0];
  });
  res.status(201).json({ gig: mapGig(gig), xpGained: XP_REWARDS.postGig });
});

exports.update = asyncHandler(async (req, res) => {
  const v = validateGig(req.body);
  const id = Number(req.params.id);
  const cur = await query('SELECT * FROM gigs WHERE id=$1', [id]);
  if (!cur.rows[0]) throw new HttpError(404, 'Gig not found');
  if (cur.rows[0].poster_id !== req.user.id) throw new HttpError(403, 'Only the owner can edit this gig');
  if (cur.rows[0].status !== 'open') throw new HttpError(409, 'Only open gigs can be edited');
  const { rows } = await query(
    `UPDATE gigs SET title=$2, description=$3, category=$4, budget=$5, deadline=$6 WHERE id=$1 RETURNING *`,
    [id, v.title, v.description, v.category, v.budget, v.deadline]
  );
  res.json({ gig: mapGig(rows[0]) });
});

exports.cancel = asyncHandler(async (req, res) => {
  await escrow.cancelOpenGig(req.user.id, Number(req.params.id));
  res.json({ message: 'Gig cancelled' });
});
