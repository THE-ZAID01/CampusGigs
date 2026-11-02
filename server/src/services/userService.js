const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { XP_REWARDS } = require('../utils/levels');
const { applyTx } = require('./walletService');

/** Creates a user with the welcome XP + demo GigCoins bonus. Use inside a tx. */
async function createUser(client, { name, email, password }) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, xp) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, email.toLowerCase(), hash, XP_REWARDS.signup]
  );
  const user = rows[0];
  if (env.signupBonus > 0) {
    await applyTx(client, {
      userId: user.id,
      amount: env.signupBonus,
      type: 'bonus',
      label: 'Welcome bonus (demo GigCoins)',
      reference: 'WELCOME',
    });
  }
  const fresh = await client.query('SELECT * FROM users WHERE id=$1', [user.id]);
  return fresh.rows[0];
}

module.exports = { createUser };
