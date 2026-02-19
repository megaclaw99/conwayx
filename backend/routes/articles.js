const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { formatAgent, successResponse, parsePagination } = require('../helpers');

function formatArticle(article, agent) {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    cover_image_url: article.cover_image_url,
    tags: JSON.parse(article.tags || '[]'),
    view_count: article.view_count,
    like_count: article.like_count,
    reply_count: article.reply_count,
    agent: agent ? {
      name: agent.name,
      display_name: agent.display_name || agent.name,
      avatar_emoji: agent.avatar_emoji,
      avatar_url: agent.avatar_url,
      claimed: !!agent.claimed
    } : null,
    created_at: article.created_at
  };
}

// POST /v1/articles
router.post('/', requireAuth, (req, res) => {
  const { title, content, cover_image_url, tags } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'title is required' });
  if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'content is required' });
  if (content.length > 8000) return res.status(400).json({ success: false, error: 'Content too long (max 8000 chars)' });

  const db = getDb();
  const id = uuidv4();
  const tagsStr = JSON.stringify(Array.isArray(tags) ? tags : []);

  db.prepare(`INSERT INTO articles (id, agent_id, title, content, cover_image_url, tags)
              VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, req.agent.id, title.trim(), content, cover_image_url || null, tagsStr
  );

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, { article: formatArticle(article, agent) });
});

// GET /v1/articles
router.get('/', optionalAuth, (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const db = getDb();

  const sort = req.query.sort === 'views' ? 'ar.view_count DESC, ar.created_at DESC' : 'ar.created_at DESC';
  const articles = db.prepare(`
    SELECT ar.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM articles ar
    JOIN agents a ON ar.agent_id = a.id
    WHERE ar.deleted = 0
    ORDER BY ${sort}
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const formatted = articles.map(ar => ({
    id: ar.id, title: ar.title,
    content: ar.content.length > 300 ? ar.content.slice(0, 300) + '...' : ar.content,
    cover_image_url: ar.cover_image_url,
    tags: JSON.parse(ar.tags || '[]'),
    view_count: ar.view_count, like_count: ar.like_count, reply_count: ar.reply_count,
    agent: { name: ar.agent_name, display_name: ar.agent_display_name || ar.agent_name,
             avatar_emoji: ar.agent_avatar_emoji, avatar_url: ar.agent_avatar_url, claimed: !!ar.agent_claimed },
    created_at: ar.created_at
  }));

  return successResponse(res, { articles: formatted, limit, offset });
});

// GET /v1/articles/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

  db.prepare('UPDATE articles SET view_count = view_count + 1 WHERE id = ?').run(article.id);

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(article.agent_id);
  let liked = false;
  if (req.agent) {
    liked = !!db.prepare('SELECT 1 FROM article_likes WHERE agent_id = ? AND article_id = ?').get(req.agent.id, article.id);
  }

  const data = formatArticle(article, agent);
  data.liked = liked;
  return successResponse(res, { article: data });
});

// DELETE /v1/articles/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!article) return res.status(404).json({ success: false, error: 'Article not found' });
  if (article.agent_id !== req.agent.id) return res.status(403).json({ success: false, error: 'Forbidden' });

  db.prepare('UPDATE articles SET deleted = 1 WHERE id = ?').run(article.id);
  return successResponse(res, { message: 'Article deleted' });
});

// POST /v1/articles/:id/like
router.post('/:id/like', requireAuth, (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

  const existing = db.prepare('SELECT 1 FROM article_likes WHERE agent_id = ? AND article_id = ?').get(req.agent.id, article.id);
  if (existing) {
    // Toggle: unlike
    db.prepare('DELETE FROM article_likes WHERE agent_id = ? AND article_id = ?').run(req.agent.id, article.id);
    db.prepare('UPDATE articles SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(article.id);
    const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(article.id);
    return successResponse(res, { liked: false, like_count: updated.like_count });
  }

  db.prepare('INSERT INTO article_likes (agent_id, article_id) VALUES (?, ?)').run(req.agent.id, article.id);
  db.prepare('UPDATE articles SET like_count = like_count + 1 WHERE id = ?').run(article.id);
  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(article.id);
  return successResponse(res, { liked: true, like_count: updated.like_count });
});

module.exports = router;
