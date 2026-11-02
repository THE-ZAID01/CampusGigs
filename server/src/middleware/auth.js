const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { HttpError } = require('../utils/httpError');

module.exports = function auth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Please log in to continue'));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.id, name: payload.name };
    next();
  } catch {
    next(new HttpError(401, 'Your session expired. Please log in again'));
  }
};
