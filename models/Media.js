const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MediaSchema = new Schema({
  deviceId: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  filename: String,
  contentType: String,
  type: { type: String }, // "photo","audio","screen_stream",...
  metadata: Schema.Types.Mixed,
  gfsId: Schema.Types.ObjectId,
  length: Number,
  uploadDate: Date,
  checksum: { type: String, index: true }
});

module.exports = mongoose.model('Media', MediaSchema);
