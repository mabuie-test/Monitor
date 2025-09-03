const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CallSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  number: { type: String },
  type: { type: String }, // incoming/outgoing
  state: { type: String }, // ringing/answered/ended
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 } // ms
});
module.exports = mongoose.model('Call', CallSchema);
