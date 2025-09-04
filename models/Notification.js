const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  packageName: String,
  title: String,
  message: String,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
