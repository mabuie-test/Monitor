// src/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// very small health endpoint
app.get('/api', (req, res) => res.json({ ok: true, time: Date.now() }));

// serve static frontend (public or frontend)
const publicDir = path.join(__dirname, '..', 'public');
const frontendDir = fs.existsSync(publicDir) ? publicDir : path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
} else {
  console.warn('No frontend folder found (public or frontend).');
  app.get('*', (req, res) => res.status(404).send('No frontend installed'));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
