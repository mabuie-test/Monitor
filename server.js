require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GridFSBucket } = require('mongodb');
const path = require('path');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dataRoutes = require('./routes/data');
const mediaRoutes = require('./routes/media');
const commandsRoutes = require('./routes/commands');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set. See .env.example");
  process.exit(1);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    const db = mongoose.connection.db;
    app.locals.gfsBucket = new GridFSBucket(db, { bucketName: 'mediaFiles' });
  })
  .catch(err => {
    console.error("MongoDB connect error:", err);
    process.exit(1);
  });

// Serve frontend static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API routes (prefix /api)
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api', dataRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api', commandsRoutes);

// Health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true }));

// fallback: serve index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
