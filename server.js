require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const smsRoutes = require('./routes/sms');
const callsRoutes = require('./routes/calls');
const locationRoutes = require('./routes/location');
const mediaRoutes = require('./routes/media');
const notificationsRoutes = require('./routes/notifications');
const appUsageRoutes = require('./routes/appUsage');
const consentRoutes = require('./routes/consent');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('MONGO_URI not set. Copy .env.example to .env and set MONGO_URI');
    process.exit(1);
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
const conn = mongoose.connection;
conn.on('error', (err) => console.error('Mongo connection error', err));
conn.once('open', () => {
    console.log('MongoDB connected');
});

// routes
app.use('/api/sms', smsRoutes);
app.use('/api/call', callsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/whatsapp', notificationsRoutes);
app.use('/api/app-usage', appUsageRoutes);
app.use('/api/consent', consentRoutes);

// serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
