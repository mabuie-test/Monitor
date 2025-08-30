const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const mongoURI = process.env.MONGO_URI;
const conn = mongoose.connection;
let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return {
            filename: file.originalname,
            metadata: {
                deviceId: req.body.deviceId || null,
                type: req.body.type || null,
                metadata: req.body.metadata || null
            },
            bucketName: 'uploads'
        };
    }
});

const upload = multer({ storage });

router.post('/upload', upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    res.status(201).json({ fileId: req.file.id, filename: req.file.filename });
});

// list files
router.get('/', async (req, res) => {
    try {
        if (!gfs) return res.status(500).json({ error: 'gfs not ready' });
        gfs.files.find().toArray((err, files) => {
            if (!files || files.length === 0) return res.json([]);
            res.json(files);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// download
router.get('/:id', (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        gfs.files.findOne({ _id: fileId }, (err, file) => {
            if (!file || file.length === 0) return res.status(404).json({ error: 'no file' });
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
