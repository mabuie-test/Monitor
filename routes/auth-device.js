// routes/auth-device.js
const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('../middleware/auth');

// POST /auth/device/register
// body: { deviceId, label, force?: boolean }
router.post('/register', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const deviceId = req.body.deviceId;
    const label = req.body.label || '';
    const force = !!req.body.force;

    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    let device = await Device.findOne({ deviceId });

    if (!device) {
      device = new Device({ deviceId, owner: userId, label, createdAt: new Date(), updatedAt: new Date() });
      await device.save();
      return res.json({ ok: true, device });
    }

    // if already owned by same user -> ok
    if (device.owner && device.owner.toString() === userId.toString()) {
      device.label = label || device.label;
      device.updatedAt = new Date();
      await device.save();
      return res.json({ ok: true, device });
    }

    // device exists and owned by different user
    if (force) {
      // OPTIONAL: add checks here (e.g., only allow force if user has role admin or confirm)
      device.owner = userId;
      device.label = label || device.label;
      device.forced = true;
      device.updatedAt = new Date();
      await device.save();
      return res.json({ ok: true, device, forced: true });
    }

    // otherwise reject
    return res.status(403).json({ error: 'device not associated to user' });
  } catch (err) {
    console.error('device register error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
