// optional script to ensure indexes are created (run: npm run migrate:indexes)
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set in .env");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');

  // load models (ensure index definitions in models are registered)
  require(path.join(__dirname, '..', 'models', 'User'));
  require(path.join(__dirname, '..', 'models', 'Device'));
  // ... other models
  require(path.join(__dirname, '..', 'models', 'Media'));

  // wait for indexes
  mongoose.connection.on('index', (err) => {
    if (err) console.error('Index error', err);
    else console.log('Indexes built');
  });

  // close after a short delay to allow indexes
  setTimeout(async () => {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }, 3000);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
