const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  packageName: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Notification', NotificationSchema);
