const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query, withTx } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/httpError');
const { privateUser, domainOf } = require('../utils/mappers');
const { createUser } = require('../services/userService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const domainHint = () => env.allowedDomains.map((d) => `@${d}`).join(' or ');

exports.register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (name.length < 2) throw new HttpError(400, 'Please enter your full name');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
  if (!env.allowedDomains.includes(domainOf(email))) {
    throw new HttpError(400, `Only ${domainHint()} emails are allowed`);
  }
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  const exists = await query('SELECT 1 FROM users WHERE email=$1', [email]);
  if (exists.rowCount) throw new HttpError(409, 'An account with this email already exists');

  const user = await withTx((client) => createUser(client, { name, email, password }));
  res.status(201).json({ message: 'Account created. You can log in now.', user: privateUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const remember = Boolean(req.body.remember);

  const { rows } = await query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Wrong email or password');

  const token = jwt.sign({ id: user.id, name: user.name }, env.jwtSecret, {
    expiresIn: remember ? '30d' : '1d',
  });
  res.json({ token, user: privateUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) throw new HttpError(401, 'Account not found');
  res.json({ user: privateUser(rows[0]) });
});

/** Demo-mode password reset: no email server, so the link is returned to the page. */
exports.forgot = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const generic = { message: 'If that email is registered, a reset link has been created.' };
  const { rows } = await query('SELECT id FROM users WHERE email=$1', [email]);
  if (!rows[0]) return res.json(generic);

  const token = crypto.randomBytes(24).toString('hex');
  await query(`UPDATE users SET reset_token=$2, reset_expires = now() + interval '15 minutes' WHERE id=$1`, [
    rows[0].id,
    sha(token),
  ]);
  const link = `${env.clientOrigin}/reset-password?token=${token}`;
  console.log(`\n[CampusGigs] Password reset link for ${email}:\n${link}\n`);
  // Demo mode only: in production you would email this instead of returning it.
  res.json({ ...generic, ...(env.isProd ? {} : { demoResetLink: link }) });
});

exports.reset = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  const { rows } = await query('SELECT id FROM users WHERE reset_token=$1 AND reset_expires > now()', [sha(token)]);
  if (!rows[0]) throw new HttpError(400, 'This reset link is invalid or expired');
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash=$2, reset_token=NULL, reset_expires=NULL WHERE id=$1', [rows[0].id, hash]);
  res.json({ message: 'Password updated. You can log in now.' });
});
