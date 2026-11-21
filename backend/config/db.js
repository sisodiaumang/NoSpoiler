const mongoose = require('mongoose');

let isConnected = false;
let isInMemoryFallback = false;

// In-memory store fallback when local MongoDB is not running
const memoryDb = {
  users: new Map(),
  packs: new Map(),
  stats: { totalBlocked: 0 }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nospoiler';

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000 // Fast fail to fallback if no Mongo running
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB server: ${err.message}`);
    console.log('[MongoDB] Running with in-memory resilient storage (no database install required).');
    isInMemoryFallback = true;
  }
};

module.exports = {
  connectDB,
  isConnected: () => isConnected,
  isInMemoryFallback: () => isInMemoryFallback,
  memoryDb
};
