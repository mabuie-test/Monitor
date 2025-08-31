// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const tokenSchema = new mongoose.Schema({
  token: { type: String, unique: true, index: true },
  deviceId: String,
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  tokens: [tokenSchema],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateTokenForDevice = function(deviceId) {
  const t = crypto.randomBytes(48).toString('hex');
  // remove existing token for deviceId (if any) and push new
  this.tokens = this.tokens.filter(it => it.deviceId !== deviceId);
  this.tokens.push({ token: t, deviceId, createdAt: new Date(), lastSeen: new Date() });
  return t;
};

userSchema.methods.touchToken = function(token) {
  const item = this.tokens.find(it => it.token === token);
  if (item) item.lastSeen = new Date();
};

userSchema.methods.revokeToken = function(token) {
  this.tokens = this.tokens.filter(it => it.token !== token);
};

module.exports = mongoose.model('User', userSchema);
