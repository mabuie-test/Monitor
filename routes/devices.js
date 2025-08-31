// routes/devices.js
const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('./_auth_mw');

// GET /api/devices  (auth)
router.get('/devices', auth, async (req, res) => {
  try {
    // se quiser filtrar por user: Device.find({ userId: req.user.userId })
    const docs = await Device.find({}).sort({ lastSeen: -1 }).lean();
    res.json(docs);
  } catch (e) {
    console.error('devices list error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/devices/:deviceId/claim   (auth) - associa device ao user
router.post('/devices/:deviceId/claim', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const userId = req.user.userId;
    await Device.updateOne({ deviceId }, { $set: { userId, lastSeen: new Date() } }, { upsert: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('claim device error', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
