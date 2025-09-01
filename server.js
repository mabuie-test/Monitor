// src/server.js  (diagnóstico)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('=== server startup: diag begin ===');
console.log('__dirname =', __dirname);

try {
  console.log('Listing files in __dirname:');
  console.log(fs.readdirSync(__dirname));
} catch (e) {
  console.warn('Could not list __dirname:', e && e.message);
}

const mwDir = path.join(__dirname, 'middlewares');
try {
  console.log('Listing files in src/middlewares (path):', mwDir);
  console.log(fs.existsSync(mwDir) ? fs.readdirSync(mwDir) : 'middlewares folder does not exist');
} catch (e) {
  console.warn('Could not list middlewares:', e && e.message);
}

// Tentar carregar middleware updateLastSeen com vários caminhos possíveis
let updateLastSeen = null;
const tryPaths = [
  './middlewares/updateLastSeen',
  './middlewares/updateLastSeen.js',
  path.join(__dirname, 'middlewares', 'updateLastSeen'),
  path.join(__dirname, 'middlewares', 'updateLastSeen.js'),
  '../src/middlewares/updateLastSeen',
  '../src/middlewares/updateLastSeen.js'
];
let lastErr = null;
for (const p of tryPaths) {
  try {
    console.log('Attempting require(', p, ')');
    // use require with resolved path if absolute
    if (path.isAbsolute(p)) {
      updateLastSeen = require(p);
    } else {
      updateLastSeen = require(p);
    }
    console.log('Loaded updateLastSeen from', p);
    break;
  } catch (err) {
    lastErr = err;
    console.warn('Require failed for', p, '->', err && err.message);
  }
}
if (!updateLastSeen) {
  console.error('WARNING: updateLastSeen middleware could NOT be loaded. Server will continue without it. Last error:', lastErr && lastErr.message);
} else {
  console.log('updateLastSeen middleware is present.');
}

// --- rest of app setup ---
const authRouter = require('./routes/auth');
const contactsRouter = require('./routes/contacts');
const dataRouter = require('./routes/data');
const mediaRouter = require('./routes/media');
const commandsRouter = require('./routes/commands');
const devicesRouter = require('./routes/devices');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend (public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Connect to MongoDB
(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) console.warn('MONGODB_URI not set in env');
    await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/monitor', { dbName: 'monitor' });
    console.log('MongoDB connected');
  } catch (e) {
    console.error('MongoDB connection error', e && e.message);
    // do NOT exit here for debugging
  }
})();

// apply updateLastSeen middleware if available
if (updateLastSeen && typeof updateLastSeen === 'function') {
  app.use('/api', updateLastSeen);
} else {
  console.warn('Skipping updateLastSeen middleware (not loaded)');
}

// routes (these routes may themselves require models - ensure models exist)
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api', dataRouter);
app.use('/api', mediaRouter);
app.use('/api', commandsRouter);
app.use('/api', devicesRouter);

app.get('/api', (req, res) => res.json({ ok: true }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
console.log('=== server startup: diag end ===');
