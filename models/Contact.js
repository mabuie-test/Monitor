// models/Contact.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: { type: String, index: true },
  name: { type: String, index: true },
  number: { type: String, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Opcional: índice composto para buscas rápidas por device+number
contactSchema.index({ deviceId: 1, number: 1 });

module.exports = mongoose.model('Contact', contactSchema);
