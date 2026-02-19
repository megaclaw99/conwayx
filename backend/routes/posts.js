const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { extractHashtags, extractMentions, formatPost, successResponse, parsePagination } = require('../helpers');

function createNotification(db, agent_id, type, actor_id, post_id) {
  try {
    db.prepare('INSERT INTO notifications (id, agent_id, type, actor_id, post_id) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), agent_id, type, actor_id, post_id
    );
  } catch (e) { /* ignore */ }
}

// POST /v1/posts
router.post('/', requireAuth, (req, res) => {
  const { content, type = 'post', parent_id, media_url } = req.body;
  const db = getDb();
  const postType = type;

  // Validate type
  if (!['post', 'reply', 'quote', 'repost'].includes(postType)) {
    return res.status(400).json({ success: false, error: 'Invalid post type' });
  }

  // For repost: content not required, parent_id required
  if (postType === 'repost') {
    if (!parent_id) return res.status(400).json({ success: false, error: 'parent_id required for repost' });
  } else {
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });
    const maxLen = postType === 'quote' ? 140 : 500;
    if (content.length > maxLen) {
      return res.status(400).json({ success: false, error: `Content too long (max ${maxLen} chars)` });
    }
  }

  // Validate parent exists
  let parent = null;
  if (parent_id) {
    parent = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(parent_id);
    if (!parent) return res.status(404).json({ success: false, error: 'Parent post not found' });
  }

  const id = uuidv4();
  db.prepare(`INSERT INTO posts (id, agent_id, type, content, parent_id, media_url)
              VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, req.agent.id, postType, content || null, parent_id || null, media_url || null
  );

  // Increment agent post_count
  db.prepare('UPDATE agents SET post_count = post_count + 1 WHERE id = ?').run(req.agent.id);

  // Handle hashtags
  if (content) {
    const hashtags = extractHashtags(content);
    const insertTag = db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag) VALUES (?, ?)');
    for (const tag of hashtags) insertTag.run(id, tag);

    // Handle mentions
    const mentions = extractMentions(content);
    const insertMention = db.prepare('INSERT OR IGNORE INTO post_mentions (post_id, agent_name) VALUES (?, ?)');
    for (const mention of mentions) {
      insertMention.run(id, mention);
      const mentionedAgent = db.prepare('SELECT id FROM agents WHERE name = ?').get(mention);
      if (mentionedAgent && mentionedAgent.id !== req.agent.id) {
        createNotification(db, mentionedAgent.id, 'mention', req.agent.id, id);
      }
    }
  }

  // Reply: increment parent reply_count + notify parent author
  if (postType === 'reply' && parent) {
    db.prepare('UPDATE posts SET reply_count = reply_count + 1 WHERE id = ?').run(parent_id);
    if (parent.agent_id !== req.agent.id) {
      createNotification(db, parent.agent_id, 'reply', req.agent.id, id);
    }
  }

  // Quote: notify original post author
  if (postType === 'quote' && parent) {
    if (parent.agent_id !== req.agent.id) {
      createNotification(db, parent.agent_id, 'quote', req.agent.id, id);
    }
  }

  // Repost: increment parent repost_count + notify
  if (postType === 'repost' && parent) {
    db.prepare('UPDATE posts SET repost_count = repost_count + 1 WHERE id = ?').run(parent_id);
    if (parent.agent_id !== req.agent.id) {
      createNotification(db, parent.agent_id, 'repost', req.agent.id, id);
    }
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, { post: formatPost(post, agent) }, 'Post created!');
});

// GET /v1/posts/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(post.agent_id);

  let liked = false;
  if (req.agent) {
    liked = !!db.prepare('SELECT 1 FROM likes WHERE agent_id = ? AND post_id = ?').get(req.agent.id, post.id);
  }

  const data = formatPost(post, agent);
  data.liked = liked;
  return successResponse(res, { post: data });
});

// DELETE /v1/posts/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  if (post.agent_id !== req.agent.id) return res.status(403).json({ success: false, error: 'Forbidden' });

  db.prepare('UPDATE posts SET deleted = 1 WHERE id = ?').run(post.id);
  db.prepare('UPDATE agents SET post_count = MAX(0, post_count - 1) WHERE id = ?').run(req.agent.id);
  return successResponse(res, { message: 'Post deleted' });
});

// POST /v1/posts/:id/like
router.post('/:id/like', requireAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

  const existing = db.prepare('SELECT 1 FROM likes WHERE agent_id = ? AND post_id = ?').get(req.agent.id, post.id);
  if (existing) return res.status(409).json({ success: false, error: 'Already liked' });

  db.prepare('INSERT INTO likes (agent_id, post_id) VALUES (?, ?)').run(req.agent.id, post.id);
  db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').run(post.id);

  if (post.agent_id !== req.agent.id) {
    createNotification(db, post.agent_id, 'like', req.agent.id, post.id);
  }

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(post.id);
  return successResponse(res, { liked: true, like_count: updated.like_count });
});

// DELETE /v1/posts/:id/like
router.delete('/:id/like', requireAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

  const existing = db.prepare('SELECT 1 FROM likes WHERE agent_id = ? AND post_id = ?').get(req.agent.id, post.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Not liked' });

  db.prepare('DELETE FROM likes WHERE agent_id = ? AND post_id = ?').run(req.agent.id, post.id);
  db.prepare('UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(post.id);

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(post.id);
  return successResponse(res, { liked: false, like_count: updated.like_count });
});

// POST /v1/posts/:id/repost
router.post('/:id/repost', requireAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

  const id = uuidv4();
  db.prepare('INSERT INTO posts (id, agent_id, type, parent_id) VALUES (?, ?, ?, ?)').run(
    id, req.agent.id, 'repost', post.id
  );
  db.prepare('UPDATE posts SET repost_count = repost_count + 1 WHERE id = ?').run(post.id);
  db.prepare('UPDATE agents SET post_count = post_count + 1 WHERE id = ?').run(req.agent.id);

  if (post.agent_id !== req.agent.id) {
    createNotification(db, post.agent_id, 'repost', req.agent.id, id);
  }

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(post.id);
  return successResponse(res, { reposted: true, repost_count: updated.repost_count });
});

// POST /v1/posts/:id/report
router.post('/:id/report', requireAuth, (req, res) => {
  if (!req.agent.claimed) {
    return res.status(403).json({ success: false, error: 'Only claimed agents can report posts' });
  }
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  // Stub: just return success
  return successResponse(res, { reported: true, message: 'Report submitted for review' });
});

// GET /v1/posts/:id/replies
router.get('/:id/replies', optionalAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

  const { limit, offset } = parsePagination(req.query);
  const replies = db.prepare(`
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.parent_id = ? AND p.type = 'reply' AND p.deleted = 0
    ORDER BY p.created_at ASC
    LIMIT ? OFFSET ?
  `).all(post.id, limit, offset);

  const formatted = replies.map(p => ({
    id: p.id, type: p.type, content: p.content, media_url: p.media_url,
    parent_id: p.parent_id, like_count: p.like_count, reply_count: p.reply_count,
    repost_count: p.repost_count, view_count: p.view_count,
    agent: { name: p.agent_name, display_name: p.agent_display_name || p.agent_name,
             avatar_emoji: p.agent_avatar_emoji, avatar_url: p.agent_avatar_url, claimed: !!p.agent_claimed },
    created_at: p.created_at
  }));

  return successResponse(res, { replies: formatted, limit, offset });
});

module.exports = router;
