const { saveDataUrl } = require('../services/storage');
const { query } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/httpError');
const { publicUser, privateUser } = require('../utils/mappers');

async function statsFor(userId, { includePrivate = false } = {}) {
  const { rows } = await query(
    `SELECT
       (SELECT count(*) FROM gigs WHERE poster_id=$1 AND status<>'cancelled')::int               AS posted,
       (SELECT count(*) FROM gigs WHERE assigned_to=$1 AND status='completed')::int              AS completed,
       (SELECT count(*) FROM gigs WHERE assigned_to=$1 AND status IN ('in_progress','delivered'))::int AS active,
       (SELECT count(*) FROM gigs WHERE poster_id=$1 AND status='completed')::int                AS hired,
       (SELECT coalesce(sum(amount),0) FROM transactions WHERE user_id=$1 AND type='escrow_release')::int AS earned`,
    [userId]
  );
  const s = rows[0];
  const out = { gigsPosted: s.posted, gigsCompleted: s.completed, gigsActive: s.active, gigsHired: s.hired };
  if (includePrivate) out.coinsEarned = s.earned;
  return out;
}

const clean = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);

exports.getMe = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  res.json({ user: privateUser(rows[0]), stats: await statsFor(req.user.id, { includePrivate: true }) });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const b = req.body;
  const name = String(b.name || '').trim();
  if (name.length < 2) throw new HttpError(400, 'Name must be at least 2 characters');

  let avatar = b.avatar;
  if (avatar === '' || avatar === null) avatar = null;
  else if (avatar !== undefined) {
    const okData = /^data:image\/(png|jpe?g|webp);base64,/.test(avatar) && avatar.length < 700_000;
    const okUrl = /^(https?:\/\/|\/api\/media\/)\S+$/.test(avatar) && avatar.length < 500;
    if (!okData && !okUrl) throw new HttpError(400, 'Profile photo must be a small PNG, JPG or WebP image');
  }

  if (typeof avatar === 'string' && avatar.startsWith('data:')) avatar = await saveDataUrl(avatar, 'avatars');

  const skills = Array.isArray(b.skills)
    ? [...new Set(b.skills.map((s) => String(s).trim().slice(0, 30)).filter(Boolean))].slice(0, 12)
    : [];

  let portfolio = clean(b.portfolioUrl, 255);
  if (portfolio && !/^https?:\/\//i.test(portfolio)) portfolio = `https://${portfolio}`;

  const upi = clean(b.upiId, 80);
  if (upi && !/^[a-z0-9.\-_]{2,}@[a-z]{2,}$/i.test(upi)) throw new HttpError(400, 'UPI ID looks invalid (example: name@okaxis)');

  const { rows } = await query(
    `UPDATE users SET name=$2, avatar = CASE WHEN $3::boolean THEN $4 ELSE avatar END,
            headline=$5, bio=$6, department=$7, year_of_study=$8, skills=$9, portfolio_url=$10, upi_id=$11
     WHERE id=$1 RETURNING *`,
    [
      req.user.id, name, avatar !== undefined, avatar === undefined ? null : avatar,
      clean(b.headline, 120), clean(b.bio, 600), clean(b.department, 80), clean(b.yearOfStudy, 20),
      skills, portfolio, upi,
    ]
  );
  res.json({ user: privateUser(rows[0]), stats: await statsFor(req.user.id, { includePrivate: true }) });
});

exports.getPublic = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id=$1', [Number(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Profile not found');
  res.json({ user: publicUser(rows[0]), stats: await statsFor(rows[0].id) });
});
