const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.post('/', async (req, res) => {
    try {
        const { deviceId, packageName, message, timestamp } = req.body;
        const n = new Notification({ deviceId, packageName, message, timestamp: timestamp ? new Date(timestamp) : new Date() });
        await n.save();
        res.status(201).json({ ok: true, id: n._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const list = await Notification.find().sort({ createdAt: -1 }).limit(500);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
