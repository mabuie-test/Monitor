const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');

// memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

function getBucket() {
  const db = mongoose.connection.db;
  return new GridFSBucket(db, { bucketName: 'uploads' });
}

// upload file
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const bucket = getBucket();

    const metadata = {
      userId: req.userId ? req.userId.toString() : null,
      deviceId: req.body.deviceId || null,
      type: req.body.type || null,
      metadata: req.body.metadata || null
    };

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata,
      contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', file => {
      return res.status(201).json({ fileId: file._id, filename: file.filename });
    });

    uploadStream.on('error', err => {
      return res.status(500).json({ error: err.message });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// list files for current user
router.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const filesColl = db.collection('uploads.files');
    const userId = req.userId ? req.userId.toString() : null;

    const cursor = filesColl.find(userId ? { 'metadata.userId': userId } : {}).sort({ uploadDate: -1 }).limit(200);
    const files = await cursor.toArray();
    const out = files.map(f => ({
      _id: f._id,
      filename: f.filename,
      metadata: f.metadata,
      length: f.length,
      contentType: f.contentType,
      uploadDate: f.uploadDate
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// download (only if belongs to user)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });

    const _id = new ObjectId(id);
    const db = mongoose.connection.db;
    const filesColl = db.collection('uploads.files');
    const file = await filesColl.findOne({ _id });

    if (!file) return res.status(404).json({ error: 'no file' });
    if (!file.metadata || file.metadata.userId !== req.userId.toString()) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on('error', err => res.status(500).json({ error: err.message }));
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
