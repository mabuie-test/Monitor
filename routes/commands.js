const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const Device = require('../models/Device');
const { requireUser } = require('../middleware/auth');

// device polls commands (no auth required for device)
router.post('/commands/poll', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.json({ commands: [] });
    const cmds = await Command.find({ targetDeviceId: deviceId, status: 'pending' }).sort({ createdAt: 1 }).lean();
    res.json({ commands: cmds });
  } catch (e) {
    console.error('commands poll err', e);
    res.status(500).json({ error: 'server error' });
  }
});

// device ack
router.post('/commands/ack', async (req, res) => {
  try {
    const { deviceId, commandId } = req.body;
    if (!commandId) return res.status(400).json({ error: 'commandId required' });
    await Command.updateOne({ _id: commandId, targetDeviceId: deviceId }, { $set: { status: 'done', doneAt: new Date() } });
    res.json({ ok: true });
  } catch (e) {
    console.error('commands ack err', e);
    res.status(500).json({ error: 'server error' });
  }
});

// user create command for device (requires user)
router.post('/device/:deviceId/command', requireUser, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command, params } = req.body;
    if (!command) return res.status(400).json({ error: 'command required' });
    const dev = await Device.findOne({ deviceId });
    if (!dev || !dev.user || String(dev.user) !== String(req.user.id)) return res.status(403).json({ error: 'device not found or not owned by user' });
    const cmd = new Command({ targetDeviceId: deviceId, targetUser: req.user.id, command, params: params || {} });
    await cmd.save();
    res.json({ ok: true, id: cmd._id });
  } catch (e) {
    console.error('device command err', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
