// src/routes/_auth_mw.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

module.exports = function (req, res, next) {
  try {
    const h = req.headers.authorization || req.headers.Authorization;
    if (!h) return res.status(401).json({ error: 'missing authorization header' });
    const parts = h.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'invalid authorization header' });
    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET); // token issued without exp is OK
    // minimal payload expected: { id: <userId>, username: <username> }
    if (!payload || !payload.id) return res.status(401).json({ error: 'invalid token payload' });
    req.user = { id: payload.id.toString(), username: payload.username || '' };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token', detail: (err && err.message) || '' });
  }
};
