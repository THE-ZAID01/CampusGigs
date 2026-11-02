const { query } = require('../config/db');
const { asyncHandler } = require('../utils/httpError');

const STATUS_FILTER = {
  finished: `g.status IN ('completed','cancelled')`,
  completed: `g.status = 'completed'`,
  cancelled: `g.status = 'cancelled'`,
  active: `g.status IN ('in_progress','delivered')`,
  all: `g.status <> 'open'`,
};

exports.list = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const role = ['posted', 'worked'].includes(req.query.role) ? req.query.role : 'all';
  const status = STATUS_FILTER[req.query.status] ? req.query.status : 'finished';

  const roleSql = role === 'posted' ? 'g.poster_id=$1' : role === 'worked' ? 'g.assigned_to=$1' : '(g.poster_id=$1 OR g.assigned_to=$1)';
  const { rows } = await query(
    `SELECT g.id, g.title, g.category, g.status, g.budget, g.escrow_amount, g.fee_amount, g.created_at, g.completed_at,
            g.poster_id, g.assigned_to, p.name AS poster_name, w.name AS worker_name,
            CASE WHEN g.poster_id=$1 THEN 'posted' ELSE 'worked' END AS my_role
       FROM gigs g JOIN users p ON p.id=g.poster_id LEFT JOIN users w ON w.id=g.assigned_to
      WHERE ${roleSql} AND ${STATUS_FILTER[status]}
      ORDER BY coalesce(g.completed_at, g.created_at) DESC LIMIT 200`,
    [me]
  );

  const items = rows.map((r) => {
    const mine = r.my_role === 'worked';
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      role: r.my_role,
      counterparty: mine ? r.poster_name : r.worker_name || null,
      amount: r.status === 'cancelled' ? 0 : mine ? r.escrow_amount - r.fee_amount : r.escrow_amount,
      budget: r.budget,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    };
  });

  const sum = await query(
    `SELECT
       count(*) FILTER (WHERE assigned_to=$1 AND status='completed')::int AS worked_done,
       count(*) FILTER (WHERE poster_id=$1 AND status='completed')::int AS posted_done,
       coalesce(sum(escrow_amount-fee_amount) FILTER (WHERE assigned_to=$1 AND status='completed'),0)::int AS earned,
       coalesce(sum(escrow_amount) FILTER (WHERE poster_id=$1 AND status='completed'),0)::int AS spent
     FROM gigs WHERE poster_id=$1 OR assigned_to=$1`,
    [me]
  );
  res.json({ items, summary: sum.rows[0] });
});
