// routes/devices.js
const express = require('express');
const Device = require('../models/Device');
const { requireUser } = require('../middleware/auth');
const router = express.Router();

// list devices for current user (requires token)
router.get('/', requireUser, async (req, res) => {
  try {
    const devices = await Device.find({ user: req.user.id }).lean();
    res.json(devices);
  } catch (e) {
    console.error('devices list error', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
