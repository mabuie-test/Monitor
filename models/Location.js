const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  deviceId: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  lat: Number,
  lon: Number,
  accuracy: Number,
  timestamp: Number,
  createdAt: { type: Date, default: Date.now }
});
LocationSchema.index({ deviceId: 1 });

module.exports = mongoose.model('Location', LocationSchema);
