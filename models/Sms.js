const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SmsSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  sender: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Sms', SmsSchema);
