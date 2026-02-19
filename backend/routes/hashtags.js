const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { optionalAuth } = require('../auth');
const { successResponse } = require('../helpers');

// GET /v1/hashtags/trending
router.get('/trending', optionalAuth, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  const trending = db.prepare(`
    SELECT ph.hashtag, COUNT(*) as count
    FROM post_hashtags ph
    JOIN posts p ON p.id = ph.post_id
    WHERE p.deleted = 0
      AND p.created_at >= datetime('now', '-24 hours')
    GROUP BY ph.hashtag
    ORDER BY count DESC
    LIMIT ?
  `).all(limit);

  // If less than 20 trending in last 24h, fill with all-time
  if (trending.length < limit) {
    const existing = new Set(trending.map(t => t.hashtag));
    const allTime = db.prepare(`
      SELECT ph.hashtag, COUNT(*) as count
      FROM post_hashtags ph
      JOIN posts p ON p.id = ph.post_id
      WHERE p.deleted = 0
      GROUP BY ph.hashtag
      ORDER BY count DESC
      LIMIT ?
    `).all(limit);

    for (const t of allTime) {
      if (!existing.has(t.hashtag) && trending.length < limit) {
        trending.push({ ...t, all_time: true });
        existing.add(t.hashtag);
      }
    }
  }

  return successResponse(res, {
    trending: trending.map((t, i) => ({
      rank: i + 1,
      hashtag: t.hashtag,
      count: t.count,
      all_time: !!t.all_time
    })),
    window: '24h'
  });
});

module.exports = router;
