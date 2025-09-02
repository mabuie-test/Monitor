const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Media = require('../models/Media');
const Device = require('../models/Device');
const { requireUser } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/media/upload
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { deviceId, type, metadata } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'no file uploaded' });

    // require device registered & associated
    const dev = await Device.findOne({ deviceId });
    if (!dev || !dev.user) return res.status(403).json({ error: 'device not registered/associated' });

    // compute checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // check duplicate for same device
    let existing = await Media.findOne({ deviceId: deviceId, checksum: checksum });
    if (existing) {
      return res.json({ ok: true, duplicate: true, existingId: existing._id });
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
          user: dev.user,
          filename: file.originalname,
          contentType: file.mimetype,
          type: type || null,
          metadata: metadata ? JSON.parse(metadata || '{}') : {},
          gfsId: uploadStream.id,
          length: uploadStream.length,
          uploadDate: uploadStream.uploadDate,
          checksum
        });
        await doc.save();

        // emit event to user room
        const io = req.app.locals.io;
        if (io && doc.user) {
          io.to(`user:${String(doc.user)}`).emit('media:new', {
            _id: doc._id,
            filename: doc.filename,
            contentType: doc.contentType,
            uploadDate: doc.uploadDate,
            type: doc.type
          });
        }

        res.json({ ok: true, id: doc._id, gfsId: uploadStream.id });
      });

  } catch (e) {
    console.error('media upload error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/media/:id -> requires JWT and ownership
router.get('/:id', requireUser, async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Media.findById(id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    if (!doc.user || String(doc.user) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' });

    const gfs = req.app.locals.gfsBucket;
    const _id = mongoose.Types.ObjectId(doc.gfsId);
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
