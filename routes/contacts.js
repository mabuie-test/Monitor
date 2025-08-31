// routes/contacts.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

/**
 * POST /api/contacts
 * Body: { deviceId, contacts: [{ name, number }, ...] }
 */
router.post('/', async (req, res) => {
  try {
    const { deviceId, contacts } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts array required' });

    // Option A: upsert contacts individually (keeps DB normalized)
    // We'll remove duplicates for the same device+number and insert new ones.
    const ops = [];
    for (const c of contacts) {
      const name = (c.name || '').toString();
      const number = (c.number || '').toString();
      if (!number) continue; // ignorar entradas sem número
      ops.push({
        updateOne: {
          filter: { deviceId, number, userId: req.userId },
          update: { $set: { name, deviceId, number, userId: req.userId } },
          upsert: true
        }
      });
    }

    if (ops.length > 0) {
      // bulkWrite para performance
      await Contact.bulkWrite(ops, { ordered: false });
    }

    res.status(201).json({ ok: true, imported: ops.length });
  } catch (err) {
    console.error('contacts.post error', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/contacts
 * Query params: deviceId (optional), q (search string, optional)
 */
router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    const deviceId = req.query.deviceId;
    const filter = { userId: req.userId };
    if (deviceId) filter.deviceId = deviceId;
    if (q) {
      // busca simples em name ou number
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { number: re }];
    }
    const list = await Contact.find(filter).sort({ name: 1 }).limit(1000);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
