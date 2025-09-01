const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CallSchema = new Schema({
  deviceId: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  number: String,
  type: String,
  state: String,
  timestamp: Number,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
});
CallSchema.index({ deviceId: 1 });

module.exports = mongoose.model('Call', CallSchema);
