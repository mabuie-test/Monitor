const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SmsSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  sender: String,
  message: String,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sms', SmsSchema);
