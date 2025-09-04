// helper utilities for GridFS usage
const mongoose = require('mongoose');
const { Readable } = require('stream');

function uploadBufferToGridFS(app, buffer, filename, contentType, metadata) {
  return new Promise((resolve, reject) => {
    const gfs = app.locals.gfsBucket;
    if (!gfs) return reject(new Error('GridFS not ready'));
    const readable = Readable.from(buffer);
    const uploadStream = gfs.openUploadStream(filename, {
      contentType: contentType || 'application/octet-stream',
      metadata: metadata || {}
    });

    readable.pipe(uploadStream)
      .on('error', (err) => reject(err))
      .on('finish', () => resolve(uploadStream));
  });
}

module.exports = {
  uploadBufferToGridFS
};

