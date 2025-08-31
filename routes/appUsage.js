const express = require('express');
const router = express.Router();
const AppUsage = require('../models/AppUsage');

router.post('/', async (req, res) => {
  try {
    const { deviceId, packageName, totalTime, lastTimeUsed } = req.body;
    const a = new AppUsage({
      userId: req.userId,
      deviceId,
      packageName,
      totalTime,
      lastTimeUsed: lastTimeUsed ? new Date(lastTimeUsed) : new Date()
    });
    await a.save();
    res.status(201).json({ ok: true, id: a._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await AppUsage.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(500);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
