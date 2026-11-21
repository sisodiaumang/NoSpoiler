const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isConnected, memoryDb } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'nospoiler_super_secret_jwt_key_2026';

// Helper to generate a clean extension API Key
function generateApiKey() {
  return 'nsp_' + crypto.randomBytes(16).toString('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = generateApiKey();

    if (isConnected()) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const user = await User.create({
        email: cleanEmail,
        password: hashedPassword,
        name: name || 'Spoiler Shield User',
        apiKey,
        customKeywords: ['gta 6', 'gta vi']
      });

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.status(201).json({
        token,
        apiKey: user.apiKey,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          customKeywords: user.customKeywords
        }
      });
    } else {
      // In-Memory Fallback
      if (memoryDb.users.has(cleanEmail)) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const userObj = {
        _id: 'mem_' + Date.now(),
        email: cleanEmail,
        password: hashedPassword,
        name: name || 'Spoiler Shield User',
        apiKey,
        customKeywords: ['gta 6', 'gta vi'],
        subscribedPacks: ['pack-gta6'],
        settings: { blurIntensity: 'high', revealOnClick: true, muteMedia: true },
        stats: { totalBlocked: 0 }
      };

      memoryDb.users.set(cleanEmail, userObj);
      const token = jwt.sign({ id: userObj._id, email: userObj.email }, JWT_SECRET, { expiresIn: '30d' });

      return res.status(201).json({
        token,
        apiKey: userObj.apiKey,
        user: {
          id: userObj._id,
          email: userObj.email,
          name: userObj.name,
          customKeywords: userObj.customKeywords
        }
      });
    }
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Server registration error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isConnected()) {
      const user = await User.findOne({ email: cleanEmail }).populate('subscribedPacks');
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        token,
        apiKey: user.apiKey,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          customKeywords: user.customKeywords,
          subscribedPacks: user.subscribedPacks,
          settings: user.settings,
          stats: user.stats
        }
      });
    } else {
      // In-Memory
      const user = memoryDb.users.get(cleanEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        token,
        apiKey: user.apiKey,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          customKeywords: user.customKeywords,
          subscribedPacks: user.subscribedPacks,
          settings: user.settings,
          stats: user.stats
        }
      });
    }
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Server authentication error' });
  }
});

// GET /api/auth/me (Get Profile by JWT or API Key)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    let user = null;

    if (apiKey) {
      if (isConnected()) {
        user = await User.findOne({ apiKey }).populate('subscribedPacks');
      } else {
        for (const u of memoryDb.users.values()) {
          if (u.apiKey === apiKey) { user = u; break; }
        }
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (isConnected()) {
        user = await User.findById(decoded.id).populate('subscribedPacks');
      } else {
        user = memoryDb.users.get(decoded.email);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized or invalid credentials' });
    }

    return res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      apiKey: user.apiKey,
      customKeywords: user.customKeywords,
      subscribedPacks: user.subscribedPacks,
      settings: user.settings,
      stats: user.stats
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
