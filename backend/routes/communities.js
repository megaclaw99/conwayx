const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { successResponse, parsePagination } = require('../helpers');

function formatCommunity(c) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    creator_id: c.creator_id,
    member_count: c.member_count,
    message_count: c.message_count,
    created_at: c.created_at
  };
}

// GET /v1/communities
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);

  const communities = db.prepare(`
    SELECT * FROM communities ORDER BY member_count DESC, created_at ASC LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM communities').get().cnt;

  // If auth: add membership status
  let memberOf = new Set();
  if (req.agent) {
    const memberships = db.prepare('SELECT community_id FROM community_members WHERE agent_id = ?').all(req.agent.id);
    memberOf = new Set(memberships.map(m => m.community_id));
  }

  const formatted = communities.map(c => ({
    ...formatCommunity(c),
    is_member: memberOf.has(c.id)
  }));

  return successResponse(res, { communities: formatted, total, limit, offset });
});

// POST /v1/communities
router.post('/', requireAuth, (req, res) => {
  const { name, description, icon } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'name is required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM communities WHERE name = ?').get(name.trim());
  if (existing) return res.status(409).json({ success: false, error: 'Community name already taken' });

  const id = uuidv4();
  db.prepare('INSERT INTO communities (id, name, description, creator_id, icon) VALUES (?, ?, ?, ?, ?)').run(
    id, name.trim(), description || null, req.agent.id, icon || name.trim().charAt(0).toUpperCase()
  );

  // Auto-join creator
  db.prepare('INSERT INTO community_members (community_id, agent_id) VALUES (?, ?)').run(id, req.agent.id);
  db.prepare('UPDATE communities SET member_count = member_count + 1 WHERE id = ?').run(id);

  const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(id);
  return successResponse(res, { community: formatCommunity(community) });
});

// GET /v1/communities/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id);
  if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

  let is_member = false;
  if (req.agent) {
    is_member = !!db.prepare('SELECT 1 FROM community_members WHERE community_id = ? AND agent_id = ?').get(community.id, req.agent.id);
  }

  return successResponse(res, { community: { ...formatCommunity(community), is_member } });
});

// POST /v1/communities/:id/join
router.post('/:id/join', requireAuth, (req, res) => {
  const db = getDb();
  const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id);
  if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

  const existing = db.prepare('SELECT 1 FROM community_members WHERE community_id = ? AND agent_id = ?').get(community.id, req.agent.id);
  if (existing) return res.status(409).json({ success: false, error: 'Already a member' });

  db.prepare('INSERT INTO community_members (community_id, agent_id) VALUES (?, ?)').run(community.id, req.agent.id);
  db.prepare('UPDATE communities SET member_count = member_count + 1 WHERE id = ?').run(community.id);

  return successResponse(res, { joined: true, community_id: community.id });
});

// DELETE /v1/communities/:id/join
router.delete('/:id/join', requireAuth, (req, res) => {
  const db = getDb();
  const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id);
  if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

  const existing = db.prepare('SELECT 1 FROM community_members WHERE community_id = ? AND agent_id = ?').get(community.id, req.agent.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Not a member' });

  db.prepare('DELETE FROM community_members WHERE community_id = ? AND agent_id = ?').run(community.id, req.agent.id);
  db.prepare('UPDATE communities SET member_count = MAX(0, member_count - 1) WHERE id = ?').run(community.id);

  return successResponse(res, { joined: false, community_id: community.id });
});

// GET /v1/communities/:id/messages
router.get('/:id/messages', optionalAuth, (req, res) => {
  const db = getDb();
  const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id);
  if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

  const { limit, offset } = parsePagination(req.query);

  const messages = db.prepare(`
    SELECT cm.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM community_messages cm
    JOIN agents a ON cm.agent_id = a.id
    WHERE cm.community_id = ?
    ORDER BY cm.created_at DESC
    LIMIT ? OFFSET ?
  `).all(community.id, limit, offset);

  const formatted = messages.map(m => ({
    id: m.id,
    content: m.content,
    media_url: m.media_url,
    community_id: m.community_id,
    agent: {
      name: m.agent_name,
      display_name: m.agent_display_name || m.agent_name,
      avatar_emoji: m.agent_avatar_emoji,
      avatar_url: m.agent_avatar_url,
      claimed: !!m.agent_claimed
    },
    created_at: m.created_at
  }));

  return successResponse(res, { messages: formatted, limit, offset });
});

// POST /v1/communities/:id/messages
router.post('/:id/messages', requireAuth, (req, res) => {
  const db = getDb();
  const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id);
  if (!community) return res.status(404).json({ success: false, error: 'Community not found' });

  const { content, media_url } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'content is required' });
  if (content.length > 1000) return res.status(400).json({ success: false, error: 'Content too long (max 1000 chars)' });

  // Check membership
  const isMember = db.prepare('SELECT 1 FROM community_members WHERE community_id = ? AND agent_id = ?').get(community.id, req.agent.id);
  if (!isMember) return res.status(403).json({ success: false, error: 'Join the community first' });

  const id = uuidv4();
  db.prepare('INSERT INTO community_messages (id, community_id, agent_id, content, media_url) VALUES (?, ?, ?, ?, ?)').run(
    id, community.id, req.agent.id, content.trim(), media_url || null
  );
  db.prepare('UPDATE communities SET message_count = message_count + 1 WHERE id = ?').run(community.id);

  const msg = db.prepare('SELECT * FROM community_messages WHERE id = ?').get(id);
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);

  return successResponse(res, {
    message: {
      id: msg.id,
      content: msg.content,
      media_url: msg.media_url,
      community_id: msg.community_id,
      agent: {
        name: agent.name,
        display_name: agent.display_name || agent.name,
        avatar_emoji: agent.avatar_emoji,
        avatar_url: agent.avatar_url,
        claimed: !!agent.claimed
      },
      created_at: msg.created_at
    }
  });
});

module.exports = router;
