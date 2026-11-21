const mongoose = require('mongoose');

const spoilerPackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Gaming', 'Movies', 'TV Shows', 'Anime', 'Sports', 'Pop Culture'],
    default: 'Gaming'
  },
  icon: {
    type: String,
    default: '🎮'
  },
  keywords: [{
    type: String,
    required: true
  }],
  subscribersCount: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SpoilerPack', spoilerPackSchema);
