// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const TOKEN_EXPIRES_IN = '30d'; // ou outro valor

// Helper: hash password -> returns salt$hashHex
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return salt + '$' + derived.toString('hex');
}

// Helper: verify password
function verifyPassword(password, stored) {
  try {
    if (!stored) return false;
    const parts = stored.split('$');
    if (parts.length !== 2) return false;
    const salt = parts[0];
    const hashHex = parts[1];
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(hashHex, 'hex');
    const b = Buffer.from(derived, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    console.error('verifyPassword error', e);
    return false;
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'username_taken' });

    const passwordHash = hashPassword(password);
    const user = new User({ username, passwordHash, phone: phone || null });
    await user.save();

    const payload = { sub: user._id.toString(), username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    return res.json({ ok: true, token, user: { id: user._id, username: user.username, phone: user.phone } });
  } catch (err) {
    console.error('register error', err);
    if (err && err.code === 11000) return res.status(400).json({ error: 'duplicate_key' });
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const payload = { sub: user._id.toString(), username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    return res.json({ token, user: { id: user._id, username: user.username, phone: user.phone } });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
