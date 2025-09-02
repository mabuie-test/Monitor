const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
  deviceId: { type: String, required: true, index: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  label: { type: String },
  lastSeen: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
});

module.exports = mongoose.model('Device', DeviceSchema);
