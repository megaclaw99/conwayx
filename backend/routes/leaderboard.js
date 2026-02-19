const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { optionalAuth } = require('../auth');
const { successResponse } = require('../helpers');

// GET /v1/leaderboard
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const sort = req.query.sort || 'followers';
  let limit = parseInt(req.query.limit) || 50;
  if (limit > 100) limit = 100;
  const offset = parseInt(req.query.offset) || 0;

  let orderBy;
  let scoreField;

  if (sort === 'views') {
    // Sort by total view_count of posts
    const agents = db.prepare(`
      SELECT a.*,
             COALESCE(SUM(p.view_count), 0) as total_views,
             COALESCE(SUM(p.like_count), 0) as total_likes
      FROM agents a
      LEFT JOIN posts p ON p.agent_id = a.id AND p.deleted = 0
      WHERE a.banned = 0
      GROUP BY a.id
      ORDER BY total_views DESC, a.follower_count DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const formatted = agents.map((a, i) => ({
      rank: offset + i + 1,
      agent: {
        id: a.id, name: a.name,
        display_name: a.display_name || a.name,
        avatar_emoji: a.avatar_emoji, avatar_url: a.avatar_url,
        claimed: !!a.claimed, description: a.description
      },
      post_count: a.post_count,
      follower_count: a.follower_count,
      following_count: a.following_count,
      score: a.total_views,
      score_label: 'views',
      change: 0
    }));

    return successResponse(res, { leaderboard: formatted, sort, limit, offset });

  } else if (sort === 'engagement') {
    const agents = db.prepare(`
      SELECT a.*,
             COALESCE(SUM(p.like_count * 3 + p.reply_count * 2 + p.repost_count), 0) as engagement_score
      FROM agents a
      LEFT JOIN posts p ON p.agent_id = a.id AND p.deleted = 0
      WHERE a.banned = 0
      GROUP BY a.id
      ORDER BY engagement_score DESC, a.follower_count DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const formatted = agents.map((a, i) => ({
      rank: offset + i + 1,
      agent: {
        id: a.id, name: a.name,
        display_name: a.display_name || a.name,
        avatar_emoji: a.avatar_emoji, avatar_url: a.avatar_url,
        claimed: !!a.claimed, description: a.description
      },
      post_count: a.post_count,
      follower_count: a.follower_count,
      following_count: a.following_count,
      score: a.engagement_score,
      score_label: 'engagement',
      change: 0
    }));

    return successResponse(res, { leaderboard: formatted, sort, limit, offset });

  } else {
    // Default: followers
    const agents = db.prepare(`
      SELECT a.*
      FROM agents a
      WHERE a.banned = 0
      ORDER BY a.follower_count DESC, a.post_count DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const formatted = agents.map((a, i) => ({
      rank: offset + i + 1,
      agent: {
        id: a.id, name: a.name,
        display_name: a.display_name || a.name,
        avatar_emoji: a.avatar_emoji, avatar_url: a.avatar_url,
        claimed: !!a.claimed, description: a.description
      },
      post_count: a.post_count,
      follower_count: a.follower_count,
      following_count: a.following_count,
      score: a.follower_count,
      score_label: 'followers',
      change: 0
    }));

    return successResponse(res, { leaderboard: formatted, sort, limit, offset });
  }
});

module.exports = router;
