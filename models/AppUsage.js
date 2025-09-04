const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppUsageSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  packageName: String,
  totalTime: Number,
  lastTimeUsed: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AppUsage', AppUsageSchema);

