const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
  deviceId: { type: String, index: true, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  label: { type: String, default: '' },
  lastSeen: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', DeviceSchema);
