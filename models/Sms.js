const mongoose = require('mongoose');
const smsSchema = new mongoose.Schema({
    deviceId: String,
    sender: String,
    message: String,
    timestamp: Date,
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Sms', smsSchema);
