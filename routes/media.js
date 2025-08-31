const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');

const mongoURI = process.env.MONGO_URI;
const conn = mongoose.connection;
let gfs;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Storage: include userId and deviceId in metadata
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return {
      filename: file.originalname,
      metadata: {
        userId: req.userId ? req.userId.toString() : null,
        deviceId: req.body.deviceId || null,
        type: req.body.type || null,
        metadata: req.body.metadata || null
      },
      bucketName: 'uploads'
    };
  }
});

const upload = multer({ storage });

// upload file (requires auth middleware earlier)
router.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.status(201).json({ fileId: req.file.id, filename: req.file.filename });
});

// list files for this user
router.get('/', async (req, res) => {
  try {
    if (!gfs) return res.status(500).json({ error: 'gfs not ready' });
    const userId = req.userId.toString();
    gfs.files.find({ 'metadata.userId': userId }).toArray((err, files) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!files || files.length === 0) return res.json([]);
      // map to smaller object
      const out = files.map(f => ({ _id: f._id, filename: f.filename, metadata: f.metadata, length: f.length, contentType: f.contentType }));
      res.json(out);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// download (only if belongs to user)
router.get('/:id', (req, res) => {
  try {
    if (!gfs) return res.status(500).json({ error: 'gfs not ready' });
    const fileId = mongoose.Types.ObjectId(req.params.id);
    gfs.files.findOne({ _id: fileId }, (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'no file' });
      if (!file.metadata || file.metadata.userId !== req.userId.toString()) {
        return res.status(403).json({ error: 'forbidden' });
      }
      const readstream = gfs.createReadStream({ _id: file._id });
      res.set('Content-Type', file.contentType || 'application/octet-stream');
      res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
      readstream.pipe(res);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
