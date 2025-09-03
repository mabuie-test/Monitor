const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  lat: { type: Number },
  lon: { type: Number },
  accuracy: { type: Number },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Location', LocationSchema);
