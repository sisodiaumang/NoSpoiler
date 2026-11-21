const express = require('express');
const router = express.Router();
const SpoilerPack = require('../models/SpoilerPack');
const User = require('../models/User');
const { isConnected, memoryDb } = require('../config/db');

// Built-in curated community packs
const DEFAULT_PACKS = [
  {
    id: 'pack-gta6',
    title: 'GTA 6 Ultimate Spoiler Shield',
    slug: 'gta-6-ultimate',
    description: 'Complete protection against GTA VI storyline leaks, Lucia & Jason plot twists, Vice City map details, and leaked audio/cutscenes.',
    category: 'Gaming',
    icon: '🌴',
    keywords: [
      'gta 6',
      'gta vi',
      'grand theft auto vi',
      'grand theft auto 6',
      'lucia',
      'jason gta',
      'vice city leak',
      'leonida leak',
      'rockstar games leak',
      'gta 6 gameplay leak',
      'gta 6 map leak',
      'gta 6 ending',
      'gta 6 trailer 2'
    ],
    subscribersCount: 148200,
    isVerified: true
  },
  {
    id: 'pack-marvel',
    title: 'Marvel MCU: Avengers & Doomsday',
    slug: 'mcu-avengers-doomsday',
    description: 'Blurs secret cast cameos, post-credits leaks, Robert Downey Jr. Doctor Doom revelations, and Secret Wars plot leaks.',
    category: 'Movies',
    icon: '⚡',
    keywords: [
      'avengers doomsday',
      'avengers secret wars',
      'doctor doom leak',
      'mcu post credits',
      'secret wars spoiler',
      'spider-man 4 leak'
    ],
    subscribersCount: 89400,
    isVerified: true
  },
  {
    id: 'pack-hotd',
    title: 'House of the Dragon: Dance of Dragons',
    slug: 'house-of-the-dragon',
    description: 'Shields character deaths, dragon battle outcomes, and Fire & Blood book spoilers for the upcoming HBO season.',
    category: 'TV Shows',
    icon: '🐉',
    keywords: [
      'house of the dragon season 3',
      'rhaenyra death',
      'daemon targaryen ending',
      'battle of the gullet spoiler',
      'aemond death'
    ],
    subscribersCount: 63100,
    isVerified: true
  },
  {
    id: 'pack-eldenring',
    title: 'Elden Ring: Shadow of the Erdtree',
    slug: 'elden-ring-erdtree',
    description: 'Hides lore reveals, final remembrance boss identities, and secret endings across Reddit and YouTube.',
    category: 'Gaming',
    icon: '⚔️',
    keywords: [
      'shadow of the erdtree final boss',
      'radahn consort',
      'miquella cutscene',
      'elden ring dlc ending',
      'bayle the dread lore'
    ],
    subscribersCount: 51200,
    isVerified: true
  },
  {
    id: 'pack-anime',
    title: 'Weekly Shonen & Anime Leaks',
    slug: 'weekly-anime-manga',
    description: 'Block raw scan leaks, Chapter spoilers, and TikTok spoiler edits before official releases.',
    category: 'Anime',
    icon: '🍥',
    keywords: [
      'one piece chapter leak',
      'jujutsu kaisen spoiler',
      'chainsaw man leak',
      'gear 5 reveal',
      'demon slayer ending'
    ],
    subscribersCount: 112000,
    isVerified: true
  }
];

// Seed memory DB with default packs
DEFAULT_PACKS.forEach(p => memoryDb.packs.set(p.id, p));

// Seed Mongo if empty
async function initMongoPacks() {
  if (!isConnected()) return;
  try {
    const count = await SpoilerPack.countDocuments();
    if (count === 0) {
      await SpoilerPack.insertMany(DEFAULT_PACKS.map(p => ({
        title: p.title,
        slug: p.slug,
        description: p.description,
        category: p.category,
        icon: p.icon,
        keywords: p.keywords,
        subscribersCount: p.subscribersCount,
        isVerified: p.isVerified
      })));
      console.log('[Packs] Seeded default spoiler packs to MongoDB');
    }
  } catch (err) {
    console.error('[Packs Init Error]', err);
  }
}

// GET /api/packs
router.get('/', async (req, res) => {
  try {
    if (isConnected()) {
      await initMongoPacks();
      const packs = await SpoilerPack.find().sort({ subscribersCount: -1 });
      return res.json(packs);
    } else {
      return res.json(Array.from(memoryDb.packs.values()));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch spoiler packs' });
  }
});

// GET /api/packs/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (isConnected()) {
      const pack = await SpoilerPack.findOne({ slug });
      if (!pack) return res.status(404).json({ error: 'Pack not found' });
      return res.json(pack);
    } else {
      const pack = Array.from(memoryDb.packs.values()).find(p => p.slug === slug || p.id === slug);
      if (!pack) return res.status(404).json({ error: 'Pack not found' });
      return res.json(pack);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pack' });
  }
});

module.exports = router;
