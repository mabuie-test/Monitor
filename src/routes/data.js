// src/routes/data.js
const express = require('express');
const router = express.Router();
const auth = require('./_auth_mw');

const Device = require('../models/Device');
const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Location = require('../models/Location');
const Contact = require('../models/Contact');

/**
 * Helper: find device belonging to user.
 * Accepts deviceRecordId (DB _id) or deviceId (ANDROID_ID).
 */
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

/* ----------------------------
   POST ingestion endpoints
   ---------------------------- */

/* POST /api/sms */
router.post('/sms', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, sender, message, timestamp, raw } = req.body || {};
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

    device.lastSeen = new Date(); await device.save();
    return res.json({ ok: true, id: s._id });
  } catch (err) {
    console.error('POST /sms error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* POST /api/call */
router.post('/call', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, number, type, state, timestamp, duration } = req.body || {};
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

    device.lastSeen = new Date(); await device.save();
    return res.json({ ok: true, id: c._id });
  } catch (err) {
    console.error('POST /call error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* POST /api/location */
router.post('/location', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, lat, lon, accuracy, timestamp } = req.body || {};
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const l = new Location({
      device: device._id,
      user: req.user.id,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      accuracy: accuracy ? parseFloat(accuracy) : 0,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await l.save();

    device.lastSeen = new Date(); await device.save();
    return res.json({ ok: true, id: l._id });
  } catch (err) {
    console.error('POST /location error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* POST /api/contacts */
router.post('/contacts', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, contacts } = req.body || {};
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts must be array' });

    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    // replace contacts for this device
    await Contact.deleteMany({ device: device._id, user: req.user.id });
    const docs = contacts.filter(c => c && (c.number || c.name)).map(c => ({
      device: device._id,
      user: req.user.id,
      name: c.name || '',
      number: c.number || ''
    }));
    if (docs.length > 0) await Contact.insertMany(docs);

    device.lastSeen = new Date(); await device.save();
    return res.json({ ok: true, count: docs.length });
  } catch (err) {
    console.error('POST /contacts error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* ----------------------------
   GET endpoints (filtered by user+device)
   ---------------------------- */

/* GET /api/sms?deviceRecordId=... or ?deviceId=... */
router.get('/sms', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, limit = 200, since } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const q = { device: device._id, user: req.user.id };
    if (since) q.timestamp = { $gte: new Date(parseInt(since)) };
    const docs = await Sms.find(q).sort({ timestamp: -1 }).limit(parseInt(limit));
    return res.json(docs);
  } catch (err) {
    console.error('GET /sms error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* GET /api/call */
router.get('/call', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, limit = 200, since } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const q = { device: device._id, user: req.user.id };
    if (since) q.timestamp = { $gte: new Date(parseInt(since)) };
    const docs = await Call.find(q).sort({ timestamp: -1 }).limit(parseInt(limit));
    return res.json(docs);
  } catch (err) {
    console.error('GET /call error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* GET /api/location */
router.get('/location', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, limit = 500, since } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const q = { device: device._id, user: req.user.id };
    if (since) q.timestamp = { $gte: new Date(parseInt(since)) };

    const docs = await Location.find(q).sort({ timestamp: -1 }).limit(parseInt(limit));
    const out = docs.map(d => ({
      _id: d._id,
      lat: d.lat,
      lon: d.lon,
      accuracy: d.accuracy,
      timestamp: d.timestamp
    }));
    return res.json(out);
  } catch (err) {
    console.error('GET /location error', err);
    return res.status(500).json({ error: err.message });
  }
});

/* GET /api/contacts */
router.get('/contacts', auth, async (req, res) => {
  try {
    const { deviceRecordId, deviceId, q = '', limit = 500 } = req.query;
    const device = await findDeviceForUser(deviceId, deviceRecordId, req.user.id);
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    const regex = q ? new RegExp(q, 'i') : null;
    const filter = { device: device._id, user: req.user.id };
    if (regex) filter.$or = [{ name: regex }, { number: regex }];
    const docs = await Contact.find(filter).sort({ name: 1 }).limit(parseInt(limit));
    return res.json(docs);
  } catch (err) {
    console.error('GET /contacts error', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
