const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppUsageSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  packageName: { type: String },
  totalTime: { type: Number, default: 0 }, // ms
  lastTimeUsed: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AppUsage', AppUsageSchema);
