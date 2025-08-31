// routes/commands.js
const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const auth = require('./_auth_mw'); // proteger admin endpoints

// device polls pending commands (POST /api/commands/poll) - body: { deviceId }
router.post('/commands/poll', async (req, res) => {
  try {
    const deviceId = req.body.deviceId;
    if (!deviceId) return res.json({ commands: [] });
    const cmds = await Command.find({ targetDeviceId: deviceId, status: 'pending' }).sort({ createdAt: 1 }).limit(50).lean();
    res.json({ commands: cmds });
  } catch (e) {
    console.error('commands poll error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// device ack (POST /api/commands/ack) - body: { deviceId, commandId }
router.post('/commands/ack', async (req, res) => {
  try {
    const { deviceId, commandId } = req.body || {};
    if (!commandId) return res.status(400).json({ error: 'commandId required' });
    await Command.updateOne({ _id: commandId, targetDeviceId: deviceId }, { $set: { status: 'done', doneAt: new Date() } });
    res.json({ ok: true });
  } catch (e) {
    console.error('commands ack error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// admin/frontend sends command to device (POST /api/device/:deviceId/command) - protected
router.post('/device/:deviceId/command', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const { command, params } = req.body || {};
    if (!command) return res.status(400).json({ error: 'command required' });
    const newCmd = new Command({ targetDeviceId: deviceId, command, params: params || {}, status: 'pending' });
    await newCmd.save();
    res.json({ ok: true, id: newCmd._id });
  } catch (e) {
    console.error('send device command error', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
