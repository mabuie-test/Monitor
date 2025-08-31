require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const contactsRoutes = require('./routes/contacts');
const authRoutes = require('./routes/auth');
const smsRoutes = require('./routes/sms');
const callsRoutes = require('./routes/calls');
const locationRoutes = require('./routes/location');
const mediaRoutes = require('./routes/media');
const notificationsRoutes = require('./routes/notifications');
const appUsageRoutes = require('./routes/appUsage');
const consentRoutes = require('./routes/consent');
const authMiddleware = require('./middleware/auth');
const updateLastSeen = require('./middlewares/updateLastSeen');
// ... depois de app.use(express.json())
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI not set. Copy .env.example to .env and set MONGO_URI');
  process.exit(1);
}

// Connect mongoose
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
const conn = mongoose.connection;
conn.on('error', (err) => console.error('Mongo connection error', err));
conn.once('open', () => console.log('MongoDB connected'));

// Public routes
app.use('/api/auth', authRoutes);

// Protected API routes (require JWT)
app.use('/api/sms', authMiddleware, smsRoutes);
app.use('/api/call', authMiddleware, callsRoutes);
app.use('/api/location', authMiddleware, locationRoutes);
app.use('/api/media', authMiddleware, mediaRoutes);
app.use('/api/whatsapp', authMiddleware, notificationsRoutes);
app.use('/api/app-usage', authMiddleware, appUsageRoutes);
app.use('/api/consent', authMiddleware, consentRoutes);
app.use('/api/contacts', authMiddleware, contactsRoutes);
app.use('/api', updateLastSeen); // opcionalmente filtra para rotas específicas

// Serve frontend static
app.use(express.static(path.join(__dirname, 'frontend')));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
