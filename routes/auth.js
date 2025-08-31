// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // só se precisar
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// register
router.post('/register', async (req, res) => {
  try {
    const { username, password, deviceId } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    let existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const user = new User({ username, password });
    // generate device token if deviceId provided
    const token = deviceId ? user.generateTokenForDevice(deviceId) : null;
    await user.save();
    return res.status(201).json({ ok: true, token, user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { username, password, deviceId } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    // If deviceId provided, generate (or renew) token for that device.
    // If deviceId not provided, generate a token for the web session (e.g., deviceId = 'web-<random>')
    const effectiveDeviceId = deviceId || `web-${Math.random().toString(36).slice(2,10)}`;
    const token = user.generateTokenForDevice(effectiveDeviceId);
    await user.save();
    res.json({ token, user: { id: user._id, username: user.username }, deviceId: effectiveDeviceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// regenerate token for a specific device (requires auth)
router.post('/token/regenerate', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newToken = user.generateTokenForDevice(deviceId);
    await user.save();
    res.json({ ok: true, token: newToken, deviceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// revoke a token (logout device) - authenticated user can revoke own device token
router.post('/token/revoke', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.revokeToken(token);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
