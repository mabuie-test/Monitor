const express = require('express');
const router = express.Router();
const Consent = require('../models/Consent');

router.post('/', async (req, res) => {
  try {
    const { deviceId, consent, timestamp } = req.body;
    const c = new Consent({
      userId: req.userId,
      deviceId,
      consent,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await c.save();
    res.status(201).json({ ok: true, id: c._1d || c._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
