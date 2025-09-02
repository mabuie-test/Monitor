const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CallSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  number: String,
  type: String,
  state: String,
  timestamp: Date,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Call', CallSchema);
