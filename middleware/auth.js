// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const secret = process.env.JWT_SECRET || 'changeme';

module.exports = async function (req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = auth.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ error: 'invalid token' });
    }
    // payload must contain user id (sub or id)
    const userId = payload.sub || payload.id || payload.userId;
    if (!userId) return res.status(401).json({ error: 'invalid token payload' });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'user not found' });
    req.user = user;
    next();
  } catch (err) {
    console.error('auth middleware error', err);
    return res.status(500).json({ error: 'server error' });
  }
};
