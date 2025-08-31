const mongoose = require('mongoose');
const consentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deviceId: String,
  consent: Boolean,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Consent', consentSchema);
