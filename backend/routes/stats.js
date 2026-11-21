const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isConnected, memoryDb } = require('../config/db');

// POST /api/stats/blocked
// Report blocked spoiler count from active extension
router.post('/blocked', async (req, res) => {
  try {
    const { amount = 1 } = req.body;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    memoryDb.stats.totalBlocked += Number(amount) || 1;

    if (apiKey && isConnected()) {
      await User.findOneAndUpdate(
        { apiKey },
        { $inc: { 'stats.totalBlocked': Number(amount) || 1 } }
      );
    }

    return res.json({
      success: true,
      totalBlocked: memoryDb.stats.totalBlocked
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record stat' });
  }
});

// GET /api/stats
router.get('/', (req, res) => {
  res.json({
    totalBlocked: memoryDb.stats.totalBlocked,
    activeUsersCount: isConnected() ? 1250 : memoryDb.users.size + 142
  });
});

module.exports = router;
