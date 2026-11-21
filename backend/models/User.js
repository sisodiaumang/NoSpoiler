const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Spoiler Shield User'
  },
  apiKey: {
    type: String,
    unique: true,
    index: true
  },
  customKeywords: [{
    type: String,
    trim: true
  }],
  subscribedPacks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpoilerPack'
  }],
  settings: {
    blurIntensity: {
      type: String,
      enum: ['medium', 'high', 'blackout'],
      default: 'high'
    },
    revealOnClick: {
      type: Boolean,
      default: true
    },
    muteMedia: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalBlocked: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
