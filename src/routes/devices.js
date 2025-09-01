// src/routes/devices.js
const express = require('express');
const router = express.Router();
const auth = require('./_auth_mw');
const Device = require('../models/Device');

/**
 * POST /api/devices/register
 * Body: { deviceId: "<ANDROID_ID>", label: "<optional>" }
 * Requires auth. Associates device to the authenticated user (creates if none).
 */
router.post('/register', auth, async (req, res) => {
  try {
    const { deviceId, label } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    // Try find device for this user
    let device = await Device.findOne({ androidId: deviceId, user: req.user.id });
    if (!device) {
      device = new Device({ androidId: deviceId, label: label || '', user: req.user.id, lastSeen: new Date() });
      await device.save();
    } else {
      // update label/lastSeen
      device.label = label || device.label;
      device.lastSeen = new Date();
      await device.save();
    }
    return res.json({ ok: true, deviceRecordId: device._id.toString(), androidId: device.androidId });
  } catch (err) {
    console.error('devices/register error', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/devices
 * Returns devices that belong to authenticated user only.
 */
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ user: req.user.id }).select('-__v').lean();
    return res.json(devices);
  } catch (err) {
    console.error('devices list error', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
