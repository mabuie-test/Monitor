const mongoose = require('mongoose');
const consentSchema = new mongoose.Schema({
    deviceId: String,
    consent: Boolean,
    timestamp: Date,
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Consent', consentSchema);
