// src/routes/data.js
const express = require('express');
const router = express.Router();
const auth = require('./_auth_mw');
const Device = require('../models/Device');
const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Location = require('../models/Location');
const Contact = require('../models/Contact');

// helper: encontra device garantindo que pertence ao user
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

/* ------------------------
   POST endpoints (existing ingestion)
   ------------------------ */

// POST /api/sms
router.post('/sms', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, sender, message, timestamp, raw } = req.body;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const s = new Sms({
      device: device._id,
      user: req.user.id,
      sender: sender || '',
      message: message || '',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      raw: raw || {}
    });
    await s.save();
    return res.json({ ok: true, id: s._id });
  } catch (e) {
    console.error('POST /sms error', e);
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/call
router.post('/call', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, number, type, state, timestamp, duration } = req.body;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const c = new Call({
      device: device._id,
      user: req.user.id,
      number: number || '',
      type: type || '',
      state: state || '',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      duration: duration || 0
    });
    await c.save();
    return res.json({ ok: true, id: c._id });
  } catch (e) {
    console.error('POST /call error', e);
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/location
router.post('/location', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, lat, lon, accuracy, timestamp } = req.body;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const l = new Location({
      device: device._id,
      user: req.user.id,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      accuracy: parseFloat(accuracy) || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await l.save();
    return res.json({ ok: true, id: l._id });
  } catch (e) {
    console.error('POST /location error', e);
    return res.status(500).json({ error: e.message });
  }
});

/* ------------------------
   GET endpoints for frontend consumption
   ------------------------ */

/**
 * GET /api/sms?deviceRecordId=...&deviceId=...&limit=50&since=timestamp
 * Returns array of SMS documents for the device (only for authenticated user's devices)
 */
router.get('/sms', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, limit = 100, since } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const q = { device: device._id, user: req.user.id };
    if (since) q.timestamp = { $gte: new Date(parseInt(since)) };

    const docs = await Sms.find(q).sort({ timestamp: -1 }).limit(parseInt(limit));
    return res.json(docs);
  } catch (e) {
    console.error('GET /sms error', e);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/call?deviceRecordId=...&deviceId=...&limit=100&since=...
 */
router.get('/call', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, limit = 100, since } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const q = { device: device._id, user: req.user.id };
    if (since) q.timestamp = { $gte: new Date(parseInt(since)) };

    const docs = await Call.find(q).sort({ timestamp: -1 }).limit(parseInt(limit));
    return res.json(docs);
  } catch (e) {
    console.error('GET /call error', e);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/location?deviceRecordId=...&deviceId=...&limit=500&since=...
 * Returns list of locations (lat, lon, accuracy, timestamp)
 */
router.get('/location', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, limit = 500, since } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const q = { device: device._id, user: req.user.id };
    if (since) q.timestamp = { $gte: new Date(parseInt(since)) };

    const docs = await Location.find(q).sort({ timestamp: -1 }).limit(parseInt(limit));
    // Normalize response: only necessary fields
    const out = docs.map(d => ({
      _id: d._id,
      lat: d.lat,
      lon: d.lon,
      accuracy: d.accuracy,
      timestamp: d.timestamp
    }));
    return res.json(out);
  } catch (e) {
    console.error('GET /location error', e);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/contacts?deviceRecordId=...&deviceId=...
 */
router.get('/contacts', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const docs = await Contact.find({ device: device._id, user: req.user.id }).sort({ name: 1 });
    return res.json(docs);
  } catch (e) {
    console.error('GET /contacts error', e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
