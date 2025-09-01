const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('./_auth_mw');

// GET /api/devices  (protected)
router.get('/devices', auth, async (req, res) => {
  try {
    // optionally filter by req.user.userId if devices associated to users
    const docs = await Device.find({}).sort({ lastSeen: -1 }).lean();
    res.json(docs);
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// POST /api/devices/:deviceId/claim  (protected)  -> associate device to logged user
router.post('/devices/:deviceId/claim', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const userId = req.user.userId;
    await Device.updateOne({ deviceId }, { $set: { userId, lastSeen: new Date() } }, { upsert: true });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

module.exports = router;
