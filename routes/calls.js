// routes/calls.js
const express = require('express');
const router = express.Router();
const Call = require('../models/Call');

// POST /api/call
// Expect body: { deviceId, number, type, state, timestamp, duration }
router.post('/', async (req, res) => {
  try {
    const { deviceId, number, type, state, timestamp, duration } = req.body;

    // Basic validation
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    // number may be null (some devices hide it) - accept null

    const c = new Call({
      userId: req.userId,
      deviceId,
      number: number || null,
      type: type || null,
      state: state || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      duration: typeof duration === 'number' ? duration : 0
    });

    await c.save();
    res.status(201).json({ ok: true, id: c._id });
  } catch (err) {
    console.error('calls.post error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/call  -> list calls for current user (paginated)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 2000);
    const skip = parseInt(req.query.skip || '0', 10);
    const filter = { userId: req.userId };
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;
    if (req.query.number) filter.number = req.query.number;
    const list = await Call.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
