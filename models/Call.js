const mongoose = require('mongoose');
const callSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: String,
  number: String,
  type: String,
  state: String,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Call', callSchema);
