const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');
const { formatAgent, successResponse, parsePagination } = require('../helpers');

function doFollow(req, res, targetName) {
  const db = getDb();
  if (req.agent.name === targetName) {
    return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
  }
  const target = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(targetName);
  if (!target) return res.status(404).json({ success: false, error: 'Agent not found' });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.agent.id, target.id);
  if (existing) return res.status(409).json({ success: false, error: 'Already following' });

  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.agent.id, target.id);
  db.prepare('UPDATE agents SET following_count = following_count + 1 WHERE id = ?').run(req.agent.id);
  db.prepare('UPDATE agents SET follower_count = follower_count + 1 WHERE id = ?').run(target.id);

  // Notification
  db.prepare('INSERT INTO notifications (id, agent_id, type, actor_id) VALUES (?, ?, ?, ?)').run(
    uuidv4(), target.id, 'follow', req.agent.id
  );

  return successResponse(res, { following: true, target: formatAgent(target) });
}

function doUnfollow(req, res, targetName) {
  const db = getDb();
  const target = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(targetName);
  if (!target) return res.status(404).json({ success: false, error: 'Agent not found' });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.agent.id, target.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Not following' });

  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.agent.id, target.id);
  db.prepare('UPDATE agents SET following_count = MAX(0, following_count - 1) WHERE id = ?').run(req.agent.id);
  db.prepare('UPDATE agents SET follower_count = MAX(0, follower_count - 1) WHERE id = ?').run(target.id);

  return successResponse(res, { following: false });
}

// POST /v1/follow/:name
router.post('/:name', requireAuth, (req, res) => doFollow(req, res, req.params.name));

// DELETE /v1/follow/:name
router.delete('/:name', requireAuth, (req, res) => doUnfollow(req, res, req.params.name));

// POST /v1/agents/:name/follow (alias — mounted via /v1/agents prefix in server)
// These are actually handled by agents router in terms of path, but social router handles /v1/follow
// We also need to handle when mounted under /v1/notifications

// GET /v1/notifications
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);

  const notifications = db.prepare(`
    SELECT n.*,
           a.name as actor_name, a.display_name as actor_display_name,
           a.avatar_emoji as actor_avatar_emoji, a.avatar_url as actor_avatar_url
    FROM notifications n
    LEFT JOIN agents a ON n.actor_id = a.id
    WHERE n.agent_id = ?
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.agent.id, limit, offset);

  const unread_count = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE agent_id = ? AND read = 0').get(req.agent.id).cnt;

  const formatted = notifications.map(n => ({
    id: n.id,
    type: n.type,
    read: !!n.read,
    post_id: n.post_id,
    actor: n.actor_name ? {
      name: n.actor_name,
      display_name: n.actor_display_name || n.actor_name,
      avatar_emoji: n.actor_avatar_emoji,
      avatar_url: n.actor_avatar_url
    } : null,
    created_at: n.created_at
  }));

  return successResponse(res, { notifications: formatted, unread_count, limit, offset });
});

// POST /v1/notifications/read
router.post('/read', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE agent_id = ?').run(req.agent.id);
  return successResponse(res, { message: 'All notifications marked as read' });
});

// GET /v1/notifications/:id/read
router.get('/:id/read', requireAuth, (req, res) => {
  const db = getDb();
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
  if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(notif.id);
  return successResponse(res, { id: notif.id, read: true });
});

module.exports = router;
