const { HttpError, asyncHandler } = require('../utils/httpError');
const escrow = require('../services/escrowService');

const note = (v, min, label) => {
  const s = String(v || '').trim().slice(0, 1000);
  if (s.length < min) throw new HttpError(400, label);
  return s;
};

exports.deliver = asyncHandler(async (req, res) => {
  const n = note(req.body.note, 5, 'Add a short delivery note or link to your work');
  await escrow.deliver(req.user.id, Number(req.params.id), n);
  res.json({ message: 'Work delivered. Waiting for the owner to confirm' });
});

exports.revision = asyncHandler(async (req, res) => {
  const n = note(req.body.note, 5, 'Tell the freelancer what needs to change');
  await escrow.requestRevision(req.user.id, Number(req.params.id), n);
  res.json({ message: 'Revision requested. Coins stay locked in escrow' });
});

exports.confirm = asyncHandler(async (req, res) => {
  const out = await escrow.confirm(req.user.id, Number(req.params.id));
  res.json({ message: `Payment released: ${out.released} GigCoins sent to the freelancer`, ...out });
});

exports.leave = asyncHandler(async (req, res) => {
  const out = await escrow.workerWithdraw(req.user.id, Number(req.params.id));
  res.json({ message: 'You left the gig. The owner was refunded in full', ...out });
});
