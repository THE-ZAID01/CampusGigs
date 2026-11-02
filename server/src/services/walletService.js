const { HttpError } = require('../utils/httpError');

/**
 * Apply a signed amount to a user's available balance and write a ledger row.
 * Must be called with a transaction client. Locks the user row first.
 */
async function applyTx(client, { userId, amount, type, gigId = null, label = '', reference = null }) {
  const { rows } = await client.query('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  if (rows[0].balance + amount < 0) {
    throw new HttpError(402, 'Not enough GigCoins in your wallet', { code: 'INSUFFICIENT_FUNDS', balance: rows[0].balance });
  }
  await client.query('UPDATE users SET balance = balance + $2 WHERE id=$1', [userId, amount]);
  const tx = await client.query(
    `INSERT INTO transactions (user_id, gig_id, type, amount, label, reference)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [userId, gigId, type, amount, label, reference]
  );
  return tx.rows[0];
}

const addXp = (client, userId, xp) =>
  client.query('UPDATE users SET xp = xp + $2 WHERE id=$1', [userId, xp]);

const ref = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e4)}`;

module.exports = { applyTx, addXp, ref };
