// src/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// routers
const authRouter = require('./routes/auth');
const contactsRouter = require('./routes/contacts');
const dataRouter = require('./routes/data');
const mediaRouter = require('./routes/media');
const commandsRouter = require('./routes/commands');
const devicesRouter = require('./routes/devices');

const updateLastSeen = require('./middlewares/updateLastSeen');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// serve frontend: prefer /public, fallback to /frontend
const publicDir = path.join(__dirname, '..', 'public');
const frontendDir = fs.existsSync(publicDir) ? publicDir : path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
} else {
  console.warn('No frontend directory found (public nor frontend).');
}

// connect to mongodb only if MONGODB_URI is defined
(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MONGODB_URI not set in env; DB-dependent routes will fail until configured.');
      return;
    }
    await mongoose.connect(uri, { dbName: 'monitor' });
    console.log('MongoDB connected');
  } catch (e) {
    console.error('MongoDB connection error', e && e.message);
  }
})();

// apply lastSeen middleware to API routes that should mark device activity
app.use('/api', updateLastSeen);

// mount routers
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api', dataRouter);
app.use('/api', mediaRouter);
app.use('/api', commandsRouter);
app.use('/api', devicesRouter);

// fallback route for SPA
app.get('*', (req, res) => {
  const indexFile = path.join(frontendDir, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return res.status(404).send('index.html not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
