const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  lat: Number,
  lon: Number,
  accuracy: Number,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Location', LocationSchema);
