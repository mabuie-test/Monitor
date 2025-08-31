const mongoose = require('mongoose');
const appUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: String,
  packageName: String,
  totalTime: Number,
  lastTimeUsed: Date,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AppUsage', appUsageSchema);
