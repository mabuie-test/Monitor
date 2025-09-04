require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dataRoutes = require('./routes/data');
const mediaRoutes = require('./routes/media');
const commandsRoutes = require('./routes/commands');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '40mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
  console.error("Please set MONGO_URI and JWT_SECRET in environment (.env).");
  process.exit(1);
}

// connect to mongo
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    const db = mongoose.connection.db;
    const GridFSBucket = mongoose.mongo.GridFSBucket;
    // create GridFSBucket and store in app.locals after server created
    app.locals.GridFSBucketClass = GridFSBucket;
    app.locals.db = db;
  })
  .catch(err => {
    console.error("MongoDB connect error:", err);
    process.exit(1);
  });

// serve frontend static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api', dataRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api', commandsRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// fallback -> serve index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start http + socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

// socket auth using token in query
io.use((socket, next) => {
  const token = socket.handshake.query && socket.handshake.query.token;
  if (!token) return next(new Error('auth error'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { id: payload.id, username: payload.username };
    return next();
  } catch (e) {
    return next(new Error('auth error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  const room = `user:${userId}`;
  socket.join(room);
  console.log('socket connected user', socket.user.username, 'room', room);

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.user && socket.user.username);
  });
});

// expose io and gfsBucket to routes after mongoose connection ready
server.on('listening', () => {
  if (app.locals.db && app.locals.GridFSBucketClass) {
    app.locals.gfsBucket = new app.locals.GridFSBucketClass(app.locals.db, { bucketName: 'mediaFiles' });
    console.log('GridFSBucket ready');
  } else {
    console.warn('GridFSBucket not ready yet');
  }
  app.locals.io = io;
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

