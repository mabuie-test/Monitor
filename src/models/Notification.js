const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  deviceId: String,
  packageName: String,
  message: String,
  timestamp: Number,
  createdAt: { type: Date, default: Date.now }
});
NotificationSchema.index({ deviceId: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
