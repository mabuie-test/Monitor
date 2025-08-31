const express = require('express');
const router = express.Router();
const Call = require('../models/Call');

router.post('/', async (req, res) => {
  try {
    const { deviceId, number, type, state, timestamp } = req.body;
    const c = new Call({
      userId: req.userId,
      deviceId,
      number,
      type,
      state,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await c.save();
    res.status(201).json({ ok: true, id: c._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await Call.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(500);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
