// models/Device.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  label: { type: String, default: '' },
  forced: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('Device', DeviceSchema);
