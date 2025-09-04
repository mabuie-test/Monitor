const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommandSchema = new Schema({
  targetDeviceId: { type: String, required: true, index: true },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  command: { type: String, required: true },
  params: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['pending','done'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  doneAt: Date
});

module.exports = mongoose.model('Command', CommandSchema);

