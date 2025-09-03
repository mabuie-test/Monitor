const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactBatchSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  contacts: { type: Array }, // array of contact objects {name, phone, ...}
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ContactBatch', ContactBatchSchema);
