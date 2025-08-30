const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
    deviceId: String,
    packageName: String,
    message: String,
    timestamp: Date,
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Notification', notificationSchema);
