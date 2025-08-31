const express = require('express');
const router = express.Router();
const Sms = require('../models/Sms');

// create (device -> server)
router.post('/', async (req, res) => {
  try {
    const { deviceId, sender, message, timestamp } = req.body;
    const s = new Sms({
      userId: req.userId,
      deviceId,
      sender,
      message,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await s.save();
    res.status(201).json({ ok: true, id: s._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// list (user)
router.get('/', async (req, res) => {
  try {
    const list = await Sms.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(500);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
