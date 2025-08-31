// middlewares/updateLastSeen.js
const Device = require('../models/Device');

module.exports = async function updateLastSeen(req, res, next) {
  try {
    const deviceId = (req.body && req.body.deviceId) || req.query.deviceId || (req.params && req.params.deviceId);
    if (deviceId) {
      await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });
    }
  } catch (e) {
    console.error('updateLastSeen middleware error', e);
  }
  next();
};
