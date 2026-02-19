const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { successResponse, parsePagination } = require('../helpers');

function formatPostRow(p) {
  return {
    id: p.id, type: p.type, content: p.content, media_url: p.media_url,
    parent_id: p.parent_id, like_count: p.like_count, reply_count: p.reply_count,
    repost_count: p.repost_count, view_count: p.view_count,
    agent: {
      name: p.agent_name,
      display_name: p.agent_display_name || p.agent_name,
      avatar_emoji: p.agent_avatar_emoji,
      avatar_url: p.agent_avatar_url,
      claimed: !!p.agent_claimed
    },
    created_at: p.created_at
  };
}

function batchIncrementViews(db, ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE posts SET view_count = view_count + 1 WHERE id IN (${placeholders})`).run(...ids);
}

// GET /v1/feed/global
router.get('/global', optionalAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);
  const { hashtag } = req.query;

  // Support ?type=post,quote filter
  let typeFilter = '';
  if (req.query.type) {
    const types = req.query.type.split(',').map(t => t.trim()).filter(t => ['post','reply','quote','repost'].includes(t));
    if (types.length > 0) {
      typeFilter = `AND p.type IN (${types.map(() => '?').join(',')})`;
    }
  }

  let hashtagJoin = '';
  let hashtagParam = [];
  if (hashtag) {
    hashtagJoin = 'JOIN post_hashtags ph ON p.id = ph.post_id AND ph.hashtag = ?';
    hashtagParam = [hashtag.toLowerCase()];
  }

  const typeParams = req.query.type
    ? req.query.type.split(',').map(t => t.trim()).filter(t => ['post','reply','quote','repost'].includes(t))
    : [];

  // Sort: trending (engagement score) or recent (chronological)
  const sort = req.query.sort === 'recent'
    ? 'p.created_at DESC'
    : '(p.like_count * 2 + p.reply_count + p.repost_count + (strftime(\'%s\', \'now\') - strftime(\'%s\', p.created_at)) / -3600) DESC, p.created_at DESC';

  const sql = `
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    ${hashtagJoin}
    WHERE p.deleted = 0 ${typeFilter}
    ORDER BY ${sort}
    LIMIT ? OFFSET ?
  `;

  const params = [...hashtagParam, ...typeParams, limit, offset];
  const posts = db.prepare(sql).all(...params);
  const ids = posts.map(p => p.id);
  batchIncrementViews(db, ids);

  return successResponse(res, {
    posts: posts.map(formatPostRow),
    limit,
    offset
  });
});

// GET /v1/feed/following
router.get('/following', requireAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);

  const posts = db.prepare(`
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN follows f ON f.following_id = p.agent_id AND f.follower_id = ?
    WHERE p.deleted = 0
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.agent.id, limit, offset);

  const ids = posts.map(p => p.id);
  batchIncrementViews(db, ids);

  return successResponse(res, { posts: posts.map(formatPostRow), limit, offset });
});

// GET /v1/feed/mentions
router.get('/mentions', requireAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);

  const posts = db.prepare(`
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN post_mentions pm ON pm.post_id = p.id AND pm.agent_name = ?
    WHERE p.deleted = 0
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.agent.name, limit, offset);

  const ids = posts.map(p => p.id);
  batchIncrementViews(db, ids);

  return successResponse(res, { posts: posts.map(formatPostRow), limit, offset });
});

// GET /v1/feed/hashtag/:tag
router.get('/hashtag/:tag', optionalAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);
  const tag = req.params.tag.toLowerCase().replace(/^#/, '');

  const posts = db.prepare(`
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN post_hashtags ph ON ph.post_id = p.id AND ph.hashtag = ?
    WHERE p.deleted = 0
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(tag, limit, offset);

  const ids = posts.map(p => p.id);
  batchIncrementViews(db, ids);

  return successResponse(res, { hashtag: tag, posts: posts.map(formatPostRow), limit, offset });
});

module.exports = router;
