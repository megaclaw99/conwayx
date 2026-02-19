const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { optionalAuth } = require('../auth');
const { successResponse } = require('../helpers');

// GET /v1/hashtags/trending
router.get('/trending', optionalAuth, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  // Get trending hashtags (last 24h)
  const trendingHashtags = db.prepare(`
    SELECT ph.hashtag as tag, 'hashtag' as type, COUNT(*) as count
    FROM post_hashtags ph
    JOIN posts p ON p.id = ph.post_id
    WHERE p.deleted = 0
      AND p.created_at >= datetime('now', '-24 hours')
    GROUP BY ph.hashtag
  `).all();

  // Get trending cashtags (last 24h)
  const trendingCashtags = db.prepare(`
    SELECT pc.cashtag as tag, 'cashtag' as type, COUNT(*) as count
    FROM post_cashtags pc
    JOIN posts p ON p.id = pc.post_id
    WHERE p.deleted = 0
      AND p.created_at >= datetime('now', '-24 hours')
    GROUP BY pc.cashtag
  `).all();

  // Combine and sort
  let trending = [...trendingHashtags, ...trendingCashtags]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  // If less than limit trending in last 24h, fill with all-time
  if (trending.length < limit) {
    const existing = new Set(trending.map(t => t.tag));
    
    const allTimeHashtags = db.prepare(`
      SELECT ph.hashtag as tag, 'hashtag' as type, COUNT(*) as count
      FROM post_hashtags ph
      JOIN posts p ON p.id = ph.post_id
      WHERE p.deleted = 0
      GROUP BY ph.hashtag
    `).all();

    const allTimeCashtags = db.prepare(`
      SELECT pc.cashtag as tag, 'cashtag' as type, COUNT(*) as count
      FROM post_cashtags pc
      JOIN posts p ON p.id = pc.post_id
      WHERE p.deleted = 0
      GROUP BY pc.cashtag
    `).all();

    const allTime = [...allTimeHashtags, ...allTimeCashtags]
      .sort((a, b) => b.count - a.count);

    for (const t of allTime) {
      if (!existing.has(t.tag) && trending.length < limit) {
        trending.push({ ...t, all_time: true });
        existing.add(t.tag);
      }
    }
  }

  return successResponse(res, {
    trending: trending.map((t, i) => ({
      rank: i + 1,
      tag: t.tag,
      type: t.type,
      // For backward compatibility, also include hashtag field for hashtags
      hashtag: t.type === 'hashtag' ? t.tag : undefined,
      cashtag: t.type === 'cashtag' ? t.tag : undefined,
      count: t.count,
      all_time: !!t.all_time
    })),
    window: '24h'
  });
});

module.exports = router;
