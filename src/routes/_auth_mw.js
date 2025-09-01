const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

module.exports = function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (!auth) return res.status(401).json({ error: 'no token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
};
