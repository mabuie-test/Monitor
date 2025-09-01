// src/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const dataRoutes = require('./routes/data');
const mediaRoutes = require('./routes/media');

const app = express();
app.use(cors());
app.use(express.json());

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monitor';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error', err);
    // do not exit: allow dev to see error
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api', dataRoutes);     // sms, call, location, contacts, app-usage, whatsapp
app.use('/api/media', mediaRoutes);

// fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
