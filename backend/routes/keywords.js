const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SpoilerPack = require('../models/SpoilerPack');
const { isConnected, memoryDb } = require('../config/db');

// Middleware to authenticate via Extension API Key or Bearer Token
async function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const authHeader = req.headers.authorization;

  if (apiKey) {
    if (isConnected()) {
      const user = await User.findOne({ apiKey });
      if (user) { req.user = user; return next(); }
    } else {
      for (const u of memoryDb.users.values()) {
        if (u.apiKey === apiKey) { req.user = u; return next(); }
      }
    }
  }

  // If no auth, allow anonymous sync with defaults
  req.user = null;
  next();
}

// GET /api/keywords
// Returns the complete active keywords list (custom user keywords + subscribed packs)
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      // Default set if unauthenticated extension
      return res.json({
        customKeywords: ['gta 6', 'gta vi'],
        allKeywords: [
          'gta 6',
          'gta vi',
          'grand theft auto vi',
          'grand theft auto 6',
          'lucia',
          'jason gta',
          'vice city leak',
          'leonida leak',
          'rockstar games leak'
        ],
        settings: {
          blurIntensity: 'high',
          revealOnClick: true,
          muteMedia: true
        }
      });
    }

    let allKeywords = [...(req.user.customKeywords || [])];

    if (isConnected()) {
      const populated = await User.findById(req.user._id).populate('subscribedPacks');
      if (populated && populated.subscribedPacks) {
        for (const pack of populated.subscribedPacks) {
          if (pack && pack.keywords) {
            allKeywords.push(...pack.keywords);
          }
        }
      }
    } else {
      if (req.user.subscribedPacks) {
        for (const packId of req.user.subscribedPacks) {
          const pack = memoryDb.packs.get(packId);
          if (pack && pack.keywords) {
            allKeywords.push(...pack.keywords);
          }
        }
      }
    }

    // Deduplicate
    const uniqueKeywords = Array.from(new Set(allKeywords.map(k => k.toLowerCase().trim())));

    return res.json({
      customKeywords: req.user.customKeywords,
      allKeywords: uniqueKeywords,
      settings: req.user.settings || { blurIntensity: 'high', revealOnClick: true, muteMedia: true }
    });
  } catch (err) {
    console.error('[Keywords GET Error]', err);
    res.status(500).json({ error: 'Failed to retrieve keywords' });
  }
});

// POST /api/keywords
// Add a keyword to user's custom blocklist
router.post('/', authenticate, async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const clean = keyword.trim().toLowerCase();

    if (!req.user) {
      return res.json({ success: true, keyword: clean });
    }

    if (!req.user.customKeywords.includes(clean)) {
      req.user.customKeywords.push(clean);
      if (isConnected()) {
        await req.user.save();
      }
    }

    return res.json({
      success: true,
      customKeywords: req.user.customKeywords
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add keyword' });
  }
});

// DELETE /api/keywords/:keyword
router.delete('/:keyword', authenticate, async (req, res) => {
  try {
    const clean = decodeURIComponent(req.params.keyword).trim().toLowerCase();

    if (!req.user) {
      return res.json({ success: true });
    }

    req.user.customKeywords = req.user.customKeywords.filter(k => k.toLowerCase() !== clean);
    if (isConnected()) {
      await req.user.save();
    }

    return res.json({
      success: true,
      customKeywords: req.user.customKeywords
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete keyword' });
  }
});

module.exports = router;
