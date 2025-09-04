

const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Device = require('../models/Device');
const { signTokenForUser, requireUser } = require('../middleware/auth');
const router = express.Router();

// register
router.post('/register', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'username taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash: hash, phone: phone || null });
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('register error', e);
    if (e && e.code === 11000) {
      const dupKey = Object.keys(e.keyPattern || e.keyValue || {})[0] || 'field';
      return res.status(400).json({ error: `${dupKey} already exists` });
    }
    res.status(500).json({ error: 'server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const token = signTokenForUser(user);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// register device (requires auth)
router.post('/device/register', requireUser, async (req, res) => {
  try {
    const { deviceId, label, metadata } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    let dev = await Device.findOne({ deviceId });
    if (!dev) {
      dev = new Device({ deviceId, user: req.user.id, label, metadata });
    } else {
      dev.user = req.user.id;
      if (label) dev.label = label;
      if (metadata) dev.metadata = metadata;
    }
    dev.lastSeen = new Date();
    await dev.save();
    res.json({ ok: true, device: { deviceId: dev.deviceId, label: dev.label } });
  } catch (e) {
    console.error('device/register error', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
