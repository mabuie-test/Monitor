const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SmsSchema = new Schema({
  deviceId: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  sender: String,
  message: String,
  timestamp: Number,
  createdAt: { type: Date, default: Date.now }
});
SmsSchema.index({ deviceId: 1 });

module.exports = mongoose.model('Sms', SmsSchema);
