const env = require('../config/env');
const { query, withTx } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/httpError');
const { applyTx, ref } = require('../services/walletService');

const UPI_RE = /^[a-z0-9.\-_]{2,}@[a-z]{2,}$/i;

exports.summary = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const tz = env.timezone;
  const [bal, locked, incoming, agg] = await Promise.all([
    query('SELECT balance, upi_id FROM users WHERE id=$1', [me]),
    query(`SELECT coalesce(sum(escrow_amount),0)::int AS v FROM gigs WHERE poster_id=$1 AND status IN ('in_progress','delivered')`, [me]),
    query(`SELECT coalesce(sum(escrow_amount),0)::int AS v FROM gigs WHERE assigned_to=$1 AND status IN ('in_progress','delivered')`, [me]),
    query(
      `WITH n AS (SELECT (now() AT TIME ZONE $2) AS ln)
       SELECT
         coalesce(sum(t.amount) FILTER (WHERE t.type='escrow_release' AND (t.created_at AT TIME ZONE $2) >= date_trunc('day', n.ln)),0)::int   AS earned_today,
         coalesce(sum(t.amount) FILTER (WHERE t.type='escrow_release' AND (t.created_at AT TIME ZONE $2) >= date_trunc('week', n.ln)),0)::int  AS earned_week,
         coalesce(sum(t.amount) FILTER (WHERE t.type='escrow_release' AND (t.created_at AT TIME ZONE $2) >= date_trunc('month', n.ln)),0)::int AS earned_month,
         coalesce(sum(t.amount) FILTER (WHERE t.type='escrow_release'),0)::int AS earned_total,
         coalesce(-sum(t.amount) FILTER (WHERE t.type IN ('escrow_hold','refund')),0)::int AS spent_total,
         coalesce(-sum(t.amount) FILTER (WHERE t.type='withdrawal'),0)::int AS withdrawn_total,
         coalesce(sum(t.amount) FILTER (WHERE t.type='topup'),0)::int AS topup_total,
         count(*) FILTER (WHERE t.type='escrow_release')::int AS payouts
       FROM n LEFT JOIN transactions t ON t.user_id=$1 GROUP BY n.ln`,
      [me, tz]
    ),
  ]);
  const a = agg.rows[0];
  res.json({
    balance: bal.rows[0].balance,
    upiId: bal.rows[0].upi_id || '',
    lockedInEscrow: locked.rows[0].v,
    incomingInEscrow: incoming.rows[0].v,
    earned: { today: a.earned_today, week: a.earned_week, month: a.earned_month, total: a.earned_total },
    spentTotal: a.spent_total,
    withdrawnTotal: a.withdrawn_total,
    topupTotal: a.topup_total,
    payouts: a.payouts,
    avgPerGig: a.payouts ? Math.round(a.earned_total / a.payouts) : 0,
    minWithdraw: env.minWithdraw,
  });
});

const BUCKETS = {
  day: { unit: 'day', count: 14, step: '1 day', fmt: 'DD Mon' },
  week: { unit: 'week', count: 8, step: '1 week', fmt: 'DD Mon' },
  month: { unit: 'month', count: 6, step: '1 month', fmt: 'Mon YY' },
};

exports.analytics = asyncHandler(async (req, res) => {
  const out = {};
  await Promise.all(
    Object.entries(BUCKETS).map(async ([key, b]) => {
      const { rows } = await query(
        `SELECT to_char(g.bucket, $6) AS label, g.bucket::date AS bucket,
                coalesce(sum(t.amount) FILTER (WHERE t.type='escrow_release'),0)::int AS earned,
                greatest(0, -coalesce(sum(t.amount) FILTER (WHERE t.type IN ('escrow_hold','refund')),0))::int AS spent
           FROM generate_series(
                  date_trunc($3, now() AT TIME ZONE $2) - (($4::int - 1) * $5::interval),
                  date_trunc($3, now() AT TIME ZONE $2),
                  $5::interval) AS g(bucket)
           LEFT JOIN transactions t
             ON t.user_id=$1 AND date_trunc($3, t.created_at AT TIME ZONE $2) = g.bucket
          GROUP BY g.bucket ORDER BY g.bucket`,
        [req.user.id, env.timezone, b.unit, b.count, b.step, b.fmt]
      );
      out[key] = rows.map((r) => ({ label: r.label.trim(), earned: r.earned, spent: r.spent }));
    })
  );
  res.json(out);
});

exports.transactions = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const { rows } = await query(
    `SELECT t.id, t.type, t.amount, t.label, t.reference, t.created_at, t.gig_id
       FROM transactions t WHERE t.user_id=$1 ORDER BY t.created_at DESC, t.id DESC LIMIT $2`,
    [req.user.id, limit]
  );
  res.json({ transactions: rows.map((r) => ({ id: r.id, type: r.type, amount: r.amount, label: r.label, reference: r.reference, createdAt: r.created_at, gigId: r.gig_id })) });
});

/** Mock UPI top-up. 1 GigCoin = Rs 1. */
exports.topup = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount < 10 || amount > 50000) {
    throw new HttpError(400, 'Add between 10 and 50,000 GigCoins at a time');
  }
  const tx = await withTx((client) =>
    applyTx(client, { userId: req.user.id, amount, type: 'topup', label: 'Added via UPI (demo)', reference: ref('UPI') })
  );
  res.status(201).json({ message: `${amount} GigCoins added to your wallet`, transaction: tx });
});

/** Mock UPI payout. */
exports.withdraw = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  const upi = String(req.body.upiId || '').trim();
  if (!UPI_RE.test(upi)) throw new HttpError(400, 'Enter a valid UPI ID (example: name@okaxis)');
  if (!Number.isInteger(amount) || amount < env.minWithdraw) {
    throw new HttpError(400, `Minimum withdrawal is ${env.minWithdraw} GigCoins`);
  }
  const tx = await withTx(async (client) => {
    const t = await applyTx(client, { userId: req.user.id, amount: -amount, type: 'withdrawal', label: `Withdrawn to ${upi}`, reference: ref('PAY') });
    await client.query('UPDATE users SET upi_id=$2 WHERE id=$1', [req.user.id, upi]);
    return t;
  });
  res.status(201).json({ message: `₹${amount} is on its way to ${upi} (demo payout)`, transaction: tx });
});
