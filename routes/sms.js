const express = require('express');
const router = express.Router();
const Sms = require('../models/Sms');

router.post('/', async (req, res) => {
    try {
        const { deviceId, sender, message, timestamp } = req.body;
        const sms = new Sms({ deviceId, sender, message, timestamp: timestamp ? new Date(timestamp) : new Date() });
        await sms.save();
        res.status(201).json({ ok: true, id: sms._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const list = await Sms.find().sort({ createdAt: -1 }).limit(200);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
