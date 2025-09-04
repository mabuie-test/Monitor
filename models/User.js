const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, index: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// partial unique index for phone (only when phone exists)
UserSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: null } } }
);

module.exports = mongoose.model('User', UserSchema);

