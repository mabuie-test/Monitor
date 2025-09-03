// models/Command.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommandSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  command: { type: String, required: true },
  params: { type: Object, default: {} },
  status: { type: String, enum: ['pending', 'executed', 'failed'], default: 'pending' },
  result: { type: String },
  createdAt: { type: Date, default: Date.now },
  executedAt: { type: Date }
});

module.exports = mongoose.model('Command', CommandSchema);
