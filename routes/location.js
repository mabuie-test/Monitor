const express = require('express');
const router = express.Router();
const Location = require('../models/Location');

router.post('/', async (req, res) => {
    try {
        const { deviceId, lat, lon, accuracy, timestamp } = req.body;
        const l = new Location({ deviceId, lat, lon, accuracy, timestamp: timestamp ? new Date(timestamp) : new Date() });
        await l.save();
        res.status(201).json({ ok: true, id: l._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const list = await Location.find().sort({ createdAt: -1 }).limit(500);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
