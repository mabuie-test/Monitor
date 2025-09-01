const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommandSchema = new Schema({
  targetDeviceId: { type: String, required: true },
  command: { type: String, required: true },
  params: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, default: 'pending' }, // pending, done
  createdAt: { type: Date, default: Date.now },
  doneAt: { type: Date }
});

module.exports = mongoose.model('Command', CommandSchema);
