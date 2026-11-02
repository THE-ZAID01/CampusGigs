const { HttpError } = require('../utils/httpError');

exports.notFound = (_req, _res, next) => next(new HttpError(404, 'Route not found'));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'That image is too large. Please choose a smaller one' });
  }
  if (err.code === '23505') return res.status(409).json({ message: 'That already exists' });
  if (err.code === '23514') return res.status(400).json({ message: 'A value was out of range' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side. Please try again' });
};
