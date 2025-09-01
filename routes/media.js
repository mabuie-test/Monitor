const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const Media = require('../models/Media');
const Device = require('../models/Device');
const auth = require('./_auth_mw');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 300 * 1024 * 1024 } });

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
}

// POST /api/media/upload
router.post('/media/upload', upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    const deviceId = req.body.deviceId;
    const metadataRaw = req.body.metadata || null;

    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    if (!file) return res.status(400).json({ error: 'media file required' });

    await Device.updateOne({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true });

    let metadata = null;
    try { metadata = metadataRaw ? JSON.parse(metadataRaw) : null; } catch (e) { metadata = metadataRaw; }

    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, { contentType: file.mimetype || 'application/octet-stream' });
    uploadStream.end(file.buffer);

    uploadStream.on('error', (err) => {
      console.error('gridfs upload error', err);
      return res.status(500).json({ error: 'upload failed' });
    });

    uploadStream.on('finish', async (uploadedFile) => {
      const m = new Media({
        deviceId,
        filename: uploadedFile.filename,
        contentType: uploadedFile.contentType,
        fileId: uploadedFile._id,
        metadata
      });
      await m.save();
      res.json({ ok: true, id: m._id, fileId: uploadedFile._id });
    });
  } catch (e) {
    console.error('media upload error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/media  (list)
router.get('/media', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;
    const docs = await Media.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(docs);
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// GET /api/media/:id -> stream
router.get('/media/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const mdoc = await Media.findById(id).lean();
    if (!mdoc) return res.status(404).json({ error: 'not found' });

    const bucket = getBucket();
    const _id = new ObjectId(mdoc.fileId);
    const downloadStream = bucket.openDownloadStream(_id);

    res.setHeader('Content-Disposition', 'attachment; filename="' + (mdoc.filename || 'file') + '"');
    res.setHeader('Content-Type', mdoc.contentType || 'application/octet-stream');

    downloadStream.on('error', (err) => {
      console.error('download error', err);
      res.status(500).end();
    });

    downloadStream.pipe(res);

  } catch (e) {
    console.error('media download error', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
