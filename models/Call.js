// models/Call.js
const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: { type: String, index: true },
  number: { type: String, index: true },
  type: { type: String }, // incoming/outgoing/missed
  state: { type: String }, // ringing/answered/ended
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 }, // duração em ms
  createdAt: { type: Date, default: Date.now }
});

// índices adicionais (ajuda nas queries por device/user/time)
callSchema.index({ userId: 1, deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Call', callSchema);
