const mongoose = require('mongoose');
const locationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: String,
  lat: Number,
  lon: Number,
  accuracy: Number,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Location', locationSchema);
