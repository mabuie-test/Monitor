// src/routes/contacts.js
const express = require('express');
const router = express.Router();
const auth = require('./_auth_mw');
const Device = require('../models/Device');
const Contact = require('../models/Contact');

async function findDeviceForUser(deviceId, deviceRecordId, userId) {
  if (deviceRecordId) {
    const d = await Device.findById(deviceRecordId);
    if (d && d.user.toString() === userId) return d;
    return null;
  }
  if (deviceId) {
    const d = await Device.findOne({ androidId: deviceId, user: userId });
    if (d) return d;
    return null;
  }
  return null;
}

// POST /api/contacts
router.post('/', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, contacts } = req.body || {};
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts must be array' });
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    await Contact.deleteMany({ device: device._id, user: req.user.id });
    const docs = contacts.filter(c => c && (c.number || c.name)).map(c => ({
      device: device._id, user: req.user.id, name: c.name || '', number: c.number || ''
    }));
    if (docs.length > 0) await Contact.insertMany(docs);

    device.lastSeen = new Date(); await device.save();
    return res.json({ ok: true, count: docs.length });
  } catch (err) {
    console.error('contacts POST error', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts?q=...&deviceRecordId=... or ?deviceId=...
router.get('/', auth, async (req, res) => {
  try {
    const { q = '', deviceRecordId, deviceId, limit = 500 } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const regex = q ? new RegExp(q, 'i') : null;
    const filter = { device: device._id, user: req.user.id };
    if (regex) filter.$or = [{ name: regex }, { number: regex }];
    const docs = await Contact.find(filter).sort({ name: 1 }).limit(parseInt(limit));
    return res.json(docs);
  } catch (err) {
    console.error('contacts GET error', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
