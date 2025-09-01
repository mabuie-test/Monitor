const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const auth = require('./_auth_mw');

// POST /api/commands/poll
router.post('/commands/poll', async (req, res) => {
  try {
    const deviceId = req.body.deviceId;
    if (!deviceId) return res.json({ commands: [] });
    const cmds = await Command.find({ targetDeviceId: deviceId, status: 'pending' }).sort({ createdAt: 1 }).limit(50).lean();
    res.json({ commands: cmds });
  } catch (e) {
    console.error('commands poll error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/commands/ack
router.post('/commands/ack', async (req, res) => {
  try {
    const { deviceId, commandId } = req.body || {};
    if (!commandId) return res.status(400).json({ error: 'commandId required' });
    await Command.updateOne({ _id: commandId, targetDeviceId: deviceId }, { $set: { status: 'done', doneAt: new Date() } });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// POST /api/device/:deviceId/command (protected)
router.post('/device/:deviceId/command', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const { command, params } = req.body || {};
    if (!command) return res.status(400).json({ error: 'command required' });
    const c = new Command({ targetDeviceId: deviceId, command, params: params || {}, status: 'pending' });
    await c.save();
    res.json({ ok: true, id: c._id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

module.exports = router;
