// src/routes/contacts.js
const express = require('express');
const router = express.Router();
const auth = require('./_auth_mw'); // middleware de autenticação já presente na tua árvore
const Device = require('../models/Device');
const Contact = require('../models/Contact');

/**
 * POST /api/contacts
 * body: { deviceId, deviceRecordId, contacts: [{ name, number }, ...] }
 * - exige autenticação (auth middleware)
 * - verifica se o device pertence ao user (deviceRecordId preferencial)
 * - substitui (replace) os contactos do device por new list
 */
router.post('/', auth, async (req, res) => {
  try {
    const { deviceId, deviceRecordId, contacts } = req.body;
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts must be array' });

    // localizar device associado ao user
    let device = null;
    if (deviceRecordId) {
      device = await Device.findById(deviceRecordId);
    }
    if (!device && deviceId) {
      device = await Device.findOne({ androidId: deviceId, user: req.user.id });
    }
    if (!device) return res.status(403).json({ error: 'device not found or not owned by user' });

    // remover contatos antigos e inserir os novos
    await Contact.deleteMany({ device: device._id, user: req.user.id });

    const docs = contacts
      .filter(c => c && (c.number || c.name))
      .map(c => ({
        device: device._id,
        user: req.user.id,
        name: c.name || '',
        number: c.number || ''
      }));

    if (docs.length > 0) {
      await Contact.insertMany(docs);
    }

    return res.json({ ok: true, count: docs.length });
  } catch (e) {
    console.error('contacts POST error', e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
