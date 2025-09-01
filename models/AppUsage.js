const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppUsageSchema = new Schema({
  deviceId: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  packageName: String,
  totalTime: Number,
  lastTimeUsed: Number,
  createdAt: { type: Date, default: Date.now }
});
AppUsageSchema.index({ deviceId: 1 });

module.exports = mongoose.model('AppUsage', AppUsageSchema);
