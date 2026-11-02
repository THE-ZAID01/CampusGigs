const router = require('express').Router();
const auth = require('../middleware/auth');
const env = require('../config/env');
const { CATEGORIES } = require('../controllers/gigController');
const { XP_PER_LEVEL, XP_REWARDS } = require('../utils/levels');

const a = require('../controllers/authController');
const u = require('../controllers/userController');
const g = require('../controllers/gigController');
const b = require('../controllers/bidController');
const e = require('../controllers/escrowController');
const w = require('../controllers/walletController');
const h = require('../controllers/historyController');

const { query } = require('../config/db');
const { sendMedia, storageMode } = require('../services/storage');

// Shows which AWS pieces are live: RDS connection and S3 vs local storage.
router.get('/health', async (_req, res) => {
  try { await query('SELECT 1'); res.json({ ok: true, database: 'connected', storage: storageMode }); }
  catch (e) { res.status(503).json({ ok: false, database: 'down', storage: storageMode }); }
});

// Public image proxy (private S3 bucket). Keys look like avatars/xxx.jpg or gigs/xxx.jpg
router.get('/media/:folder/:file', async (req, res) => {
  const { folder, file } = req.params;
  if (!['avatars', 'gigs'].includes(folder) || !/^[\w.-]+$/.test(file)) return res.status(404).end();
  try { await sendMedia(`${folder}/${file}`, res); } catch { if (!res.headersSent) res.status(404).end(); }
});
router.get('/meta', (_req, res) =>
  res.json({
    categories: CATEGORIES,
    allowedDomains: env.allowedDomains,
    feePercent: env.feePercent,
    minWithdraw: env.minWithdraw,
    xpPerLevel: XP_PER_LEVEL,
    xpRewards: XP_REWARDS,
  })
);

// auth
router.post('/auth/register', a.register);
router.post('/auth/login', a.login);
router.post('/auth/forgot', a.forgot);
router.post('/auth/reset', a.reset);
router.get('/auth/me', auth, a.me);

// users
router.get('/users/me', auth, u.getMe);
router.put('/users/me', auth, u.updateMe);
router.get('/users/:id', auth, u.getPublic);

// gigs
router.get('/gigs', auth, g.list);
router.post('/gigs', auth, g.create);
router.get('/gigs/:id', auth, g.get);
router.put('/gigs/:id', auth, g.update);
router.delete('/gigs/:id', auth, g.cancel);

// bids
router.post('/gigs/:id/bids', auth, b.place);
router.get('/bids/mine', auth, b.mine);
router.delete('/bids/:id', auth, b.withdraw);
router.post('/bids/:id/accept', auth, b.accept);

// escrow actions
router.post('/gigs/:id/deliver', auth, e.deliver);
router.post('/gigs/:id/revision', auth, e.revision);
router.post('/gigs/:id/confirm', auth, e.confirm);
router.post('/gigs/:id/leave', auth, e.leave);

// wallet
router.get('/wallet', auth, w.summary);
router.get('/wallet/analytics', auth, w.analytics);
router.get('/wallet/transactions', auth, w.transactions);
router.post('/wallet/topup', auth, w.topup);
router.post('/wallet/withdraw', auth, w.withdraw);

// history
router.get('/history', auth, h.list);

module.exports = router;
