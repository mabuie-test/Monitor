const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ObjectId } = require('mongodb');
const Media = require('../models/Media');
const Device = require('../models/Device');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/media/upload
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { deviceId, type, metadata } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'no file uploaded' });

    let dev = null;
    if (deviceId) dev = await Device.findOne({ deviceId });
    if (!dev && deviceId) {
      dev = new Device({ deviceId, lastSeen: new Date() });
      await dev.save();
    }

    const gfs = req.app.locals.gfsBucket;
    if (!gfs) return res.status(500).json({ error: 'GridFS not ready' });

    const readable = require('stream').Readable.from(file.buffer);
    const uploadStream = gfs.openUploadStream(file.originalname, {
      contentType: file.mimetype || 'application/octet-stream',
      metadata: { deviceId, type, originalName: file.originalname, customMetadata: metadata ? JSON.parse(metadata || '{}') : {} }
    });

    readable.pipe(uploadStream)
      .on('error', (err) => {
        console.error('gridfs upload err', err);
        res.status(500).json({ error: 'upload error' });
      })
      .on('finish', async () => {
        const doc = new Media({
          deviceId,
          user: dev && dev.user ? dev.user : null,
          filename: file.originalname,
          contentType: file.mimetype,
          metadata: metadata ? JSON.parse(metadata || '{}') : {},
          gfsId: uploadStream.id,
          length: uploadStream.length,
          uploadDate: uploadStream.uploadDate
        });
        await doc.save();
        res.json({ ok: true, id: doc._id, gfsId: uploadStream.id });
      });

  } catch (e) {
    console.error('media upload error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/media/:id -> requires JWT
const { requireUser } = require('../middleware/auth');
router.get('/:id', requireUser, async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Media.findById(id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    if (!doc.user || String(doc.user) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' });

    const gfs = req.app.locals.gfsBucket;
    const _id = (typeof doc.gfsId === 'string') ? new ObjectId(doc.gfsId) : doc.gfsId;
    const downloadStream = gfs.openDownloadStream(_id);
    res.setHeader('Content-Disposition', 'attachment; filename="' + (doc.filename || 'file') + '"');
    res.setHeader('Content-Type', doc.contentType || 'application/octet-stream');
    downloadStream.pipe(res);
    downloadStream.on('error', (err) => {
      console.error('gridfs download err', err);
      res.status(500).end();
    });
  } catch (e) {
    console.error('media download err', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
