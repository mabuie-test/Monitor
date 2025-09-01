const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MediaSchema = new Schema({
  deviceId: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  filename: String,
  contentType: String,
  fileId: Schema.Types.ObjectId,
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});
MediaSchema.index({ deviceId: 1 });

module.exports = mongoose.model('Media', MediaSchema);
