const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("JWT_SECRET not set in env. See .env.example");
  process.exit(1);
}

async function requireUser(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await User.findById(payload.id).select('-passwordHash').lean();
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function signTokenForUser(user) {
  const jwtLib = require('jsonwebtoken');
  return jwtLib.sign({ id: user._id, username: user.username }, SECRET);
}

module.exports = {
  requireUser,
  signTokenForUser
};
