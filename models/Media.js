const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MediaSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  filename: String,
  contentType: String,
  metadata: Schema.Types.Mixed,
  gfsId: Schema.Types.ObjectId,
  length: Number,
  uploadDate: Date
});

module.exports = mongoose.model('Media', MediaSchema);
