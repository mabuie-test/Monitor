// routes/commands.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Device = require('../models/Device');
const Command = require('../models/Command'); // precisa existir

// helper: validar se device pertence ao usuário autenticado
async function ensureDeviceBelongsToUser(deviceId, user) {
  if (!deviceId) {
    const e = new Error('deviceId required');
    e.status = 400;
    throw e;
  }
  const device = await Device.findOne({ deviceId });
  if (!device) {
    const e = new Error('device not found');
    e.status = 404;
    throw e;
  }
  if (!device.owner || device.owner.toString() !== user._id.toString()) {
    const e = new Error('device not associated to user');
    e.status = 403;
    throw e;
  }
  return device;
}

// POST /api/commands/send  -> envia comando para device
// body: { deviceId, command, params }
router.post('/send', auth, async (req, res) => {
  try {
    const { deviceId, command, params } = req.body;
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'deviceId and command are required' });
    }

    await ensureDeviceBelongsToUser(deviceId, req.user);

    const cmd = new Command({
      deviceId,
      user: req.user._id,
      command,
      params: params || {},
      status: 'pending',
      createdAt: new Date()
    });
    await cmd.save();

    return res.json({ ok: true, command: cmd });
  } catch (err) {
    console.error('POST /api/commands/send error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// GET /api/commands/device/:deviceId  -> lista comandos de um device
router.get('/device/:deviceId', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    await ensureDeviceBelongsToUser(deviceId, req.user);

    const commands = await Command.find({ deviceId, user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ ok: true, commands });
  } catch (err) {
    console.error('GET /api/commands/device/:deviceId error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

// POST /api/commands/:id/status  -> atualiza status de comando
// body: { status, result }
router.post('/:id/status', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const cmd = await Command.findById(id);
    if (!cmd) return res.status(404).json({ error: 'command not found' });
    if (cmd.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'not authorized' });
    }

    if (req.body.status) cmd.status = req.body.status;
    if (req.body.result) cmd.result = req.body.result;
    if (req.body.status === 'executed') cmd.executedAt = new Date();

    await cmd.save();
    return res.json({ ok: true, command: cmd });
  } catch (err) {
    console.error('POST /api/commands/:id/status error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

module.exports = router;
