const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String,
  number: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contact', ContactSchema);
