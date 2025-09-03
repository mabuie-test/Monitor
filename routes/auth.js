// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');        // bcryptjs -> evita problemas de build nativo
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const TOKEN_EXPIRES_IN = '30d'; // ajusta se necessário

// POST /api/auth/register
// body: { username, password, phone? }
router.post('/register', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    // check existing
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'username_taken' });

    // hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      passwordHash: hash,
      phone: phone || null
    });

    await user.save();

    // Optionally auto-login: sign token and return it
    const payload = { sub: user._id.toString(), username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    return res.json({ ok: true, token, user: { id: user._id, username: user.username, phone: user.phone } });
  } catch (err) {
    console.error('register error', err);
    // duplicate key might throw a MongoError
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'duplicate_key' });
    }
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/auth/login
// body: { username, password }
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
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
