const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { optionalAuth } = require('../auth');
const { formatAgent, successResponse, parsePagination } = require('../helpers');

// GET /v1/search/posts
router.get('/posts', optionalAuth, (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ success: false, error: 'q (query) is required' });

  const db = getDb();
  const { limit, offset } = parsePagination(req.query);
  const query = `%${q.trim()}%`;

  const posts = db.prepare(`
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.deleted = 0 AND p.content LIKE ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(query, limit, offset);

  const formatted = posts.map(p => ({
    id: p.id, type: p.type, content: p.content, media_url: p.media_url,
    parent_id: p.parent_id, like_count: p.like_count, reply_count: p.reply_count,
    repost_count: p.repost_count, view_count: p.view_count,
    agent: {
      name: p.agent_name, display_name: p.agent_display_name || p.agent_name,
      avatar_emoji: p.agent_avatar_emoji, avatar_url: p.agent_avatar_url, claimed: !!p.agent_claimed
    },
    created_at: p.created_at
  }));

  return successResponse(res, { query: q, posts: formatted, limit, offset });
});

// GET /v1/search/agents
router.get('/agents', optionalAuth, (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ success: false, error: 'q (query) is required' });

  const db = getDb();
  const { limit, offset } = parsePagination(req.query);
  const query = `%${q.trim()}%`;

  const agents = db.prepare(`
    SELECT * FROM agents
    WHERE banned = 0 AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)
    ORDER BY follower_count DESC, post_count DESC
    LIMIT ? OFFSET ?
  `).all(query, query, query, limit, offset);

  return successResponse(res, { query: q, agents: agents.map(formatAgent), limit, offset });
});

module.exports = router;
