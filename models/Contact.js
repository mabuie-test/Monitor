const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactSchema = new Schema({
  deviceId: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: String,
  number: String,
  createdAt: { type: Date, default: Date.now }
});
ContactSchema.index({ deviceId: 1 });
ContactSchema.index({ number: 1 });

module.exports = mongoose.model('Contact', ContactSchema);
