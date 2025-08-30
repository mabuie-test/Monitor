const mongoose = require('mongoose');
const locationSchema = new mongoose.Schema({
    deviceId: String,
    lat: Number,
    lon: Number,
    accuracy: Number,
    timestamp: Date,
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Location', locationSchema);
