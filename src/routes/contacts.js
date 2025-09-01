const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Device = require('../models/Device');
const auth = require('./_auth_mw');

// POST /api/contacts
router.post('/', async (req, res) => {
  try {
    const { deviceId, contacts } = req.body || {};
    if (!deviceId || !Array.isArray(contacts)) return res.status(400).json({ error: 'deviceId and contacts required' });

    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });

    const ops = [];
    contacts.forEach(c => {
      if (!c.number) return;
      const number = (c.number || '').toString();
      ops.push({
        updateOne: {
          filter: { deviceId, number },
          update: { $set: { name: c.name || '', number, deviceId } },
          upsert: true
        }
      });
    });

    if (ops.length) await Contact.bulkWrite(ops, { ordered: false });

    res.json({ ok: true, processed: ops.length });
  } catch (e) {
    console.error('contacts post error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/contacts (protected)
router.get('/', auth, async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = Math.min(2000, parseInt(req.query.limit || '200', 10));
    const skip = parseInt(req.query.skip || '0', 10);
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { number: { $regex: q.replace(/[^\d]/g, ''), $options: 'i' } }
      ];
    }
    const docs = await Contact.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean();
    res.json(docs);
  } catch (e) {
    console.error('contacts get error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
