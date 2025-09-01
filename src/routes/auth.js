const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'username exists' });
    const hash = await bcrypt.hash(password, 10);
    const u = new User({ username, passwordHash: hash });
    await u.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('register error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const u = await User.findOne({ username });
    if (!u) return res.status(400).json({ error: 'invalid' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(400).json({ error: 'invalid' });
    const token = jwt.sign({ userId: u._id, username: u.username }, JWT_SECRET);
    res.json({ token, user: { _id: u._id, username: u.username } });
  } catch (e) {
    console.error('login error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
