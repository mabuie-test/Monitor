// routes/media.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Device = require('../models/Device');

// multer memory storage (cuidado: para ficheiros muito grandes pode precisar de outra estratégia)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// helper: valida se device pertence ao user (lança erro com .status)
async function ensureDeviceBelongsToUser(deviceId, user) {
  if (!deviceId) {
    const e = new Error('deviceId required');
    e.status = 400;
    throw e;
  }
  const device = await Device.findOne({ deviceId });
  if (!device) {
    const e = new Error('device not found');
    e.status = 404;
    throw e;
  }
  if (!device.owner || device.owner.toString() !== user._id.toString()) {
    const e = new Error('device not associated to user');
    e.status = 403;
    throw e;
  }
  return device;
}

// helper to get GridFSBucket (fallback if not initialized)
function getBucket(req) {
  if (req.app && req.app.locals && req.app.locals.gfsBucket) return req.app.locals.gfsBucket;
  // fallback create one (useful in dev)
  const db = mongoose.connection.db;
  const GridFSBucket = mongoose.mongo.GridFSBucket;
  const bucket = new GridFSBucket(db, { bucketName: 'mediaFiles' });
  // also set in app.locals for reuse
  if (req.app && req.app.locals) req.app.locals.gfsBucket = bucket;
  return bucket;
}

/**
 * POST /api/media/upload
 * form-data fields:
 *  - deviceId (string)
 *  - type (string) optional
 *  - metadata (string; optional JSON)
 *  - media (file)   <-- file field
 */
router.post('/upload', auth, upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'no file provided' });

    const deviceId = req.body.deviceId;
    await ensureDeviceBelongsToUser(deviceId, req.user);

    const type = req.body.type || 'unknown';
    let extraMetadata = null;
    try { extraMetadata = req.body.metadata ? JSON.parse(req.body.metadata) : null; } catch (e) { extraMetadata = null; }

    const bucket = getBucket(req);
    const filename = file.originalname || ('file-' + Date.now());

    const uploadOpts = {
      metadata: {
        user: req.user._id.toString(),
        deviceId: deviceId,
        type,
        originalName: file.originalname,
        extra: extraMetadata
      },
      contentType: file.mimetype || 'application/octet-stream'
    };

    const uploadStream = bucket.openUploadStream(filename, uploadOpts);
    uploadStream.end(file.buffer);

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error', err);
      return res.status(500).json({ error: 'upload_failed' });
    });

    uploadStream.on('finish', (fileDoc) => {
      // fileDoc contains _id, length, filename, metadata, etc.
      return res.json({ ok: true, id: fileDoc._id, filename: fileDoc.filename, length: fileDoc.length });
    });
  } catch (err) {
    console.error('POST /api/media/upload error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

/**
 * GET /api/media
 * list media for authenticated user (paginated)
 * query params: page (default 0), limit (default 50)
 */
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(0, parseInt(req.query.page || '0', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));

    const bucket = getBucket(req);
    const filesColl = bucket.s._filesCollection || req.app.locals.gfsFilesCollection; // internal, fallback
    // safer approach: query collection by name
    const filesColName = `${bucket.s.options.bucketName}.files`;
    const db = mongoose.connection.db;

    const q = { 'metadata.user': mongoose.Types.ObjectId(req.user._id) };

    const total = await db.collection(filesColName).countDocuments(q);
    const cursor = db.collection(filesColName)
      .find(q)
      .sort({ uploadDate: -1 })
      .skip(page * limit)
      .limit(limit);

    const items = await cursor.toArray();

    return res.json({ ok: true, total, page, limit, items });
  } catch (err) {
    console.error('GET /api/media list error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/media/device/:deviceId
 * list media for a specific device (validates device ownership)
 */
router.get('/device/:deviceId', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    await ensureDeviceBelongsToUser(deviceId, req.user);

    const bucket = getBucket(req);
    const filesColName = `${bucket.s.options.bucketName}.files`;
    const db = mongoose.connection.db;

    const q = { 'metadata.deviceId': deviceId, 'metadata.user': mongoose.Types.ObjectId(req.user._id) };
    const items = await db.collection(filesColName).find(q).sort({ uploadDate: -1 }).toArray();

    return res.json({ ok: true, items });
  } catch (err) {
    console.error('GET /api/media/device error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

/**
 * GET /api/media/:id  -> stream file inline (Content-Type from metadata.contentType)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const bucket = getBucket(req);
    const _id = new mongoose.Types.ObjectId(id);

    // first read file doc to verify ownership
    const filesColName = `${bucket.s.options.bucketName}.files`;
    const db = mongoose.connection.db;
    const fileDoc = await db.collection(filesColName).findOne({ _id });
    if (!fileDoc) return res.status(404).json({ error: 'file not found' });

    // verify user owns that file
    if (!fileDoc.metadata || fileDoc.metadata.user !== req.user._id.toString()) {
      return res.status(403).json({ error: 'not authorized' });
    }

    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    // inline display
    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error', err);
      if (!res.headersSent) res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('GET /api/media/:id error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

/**
 * GET /api/media/download/:id  -> force download with Content-Disposition
 */
router.get('/download/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const bucket = getBucket(req);
    const _id = new mongoose.Types.ObjectId(id);
    const filesColName = `${bucket.s.options.bucketName}.files`;
    const db = mongoose.connection.db;
    const fileDoc = await db.collection(filesColName).findOne({ _id });
    if (!fileDoc) return res.status(404).json({ error: 'file not found' });
    if (!fileDoc.metadata || fileDoc.metadata.user !== req.user._id.toString()) {
      return res.status(403).json({ error: 'not authorized' });
    }

    const originalName = (fileDoc.metadata && fileDoc.metadata.originalName) ? fileDoc.metadata.originalName : fileDoc.filename;
    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName.replace(/"/g, '')}"`);
    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error', err);
      if (!res.headersSent) res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('GET /api/media/download/:id error', err);
    return res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
});

module.exports = router;
