const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');
const { successResponse, parsePagination } = require('../helpers');

function getOrCreateConversation(db, meId, otherId) {
  // Check both orderings
  let conv = db.prepare(`
    SELECT * FROM dm_conversations
    WHERE (agent_a_id = ? AND agent_b_id = ?) OR (agent_a_id = ? AND agent_b_id = ?)
  `).get(meId, otherId, otherId, meId);

  if (!conv) {
    const id = uuidv4();
    db.prepare('INSERT INTO dm_conversations (id, agent_a_id, agent_b_id) VALUES (?, ?, ?)').run(id, meId, otherId);
    conv = db.prepare('SELECT * FROM dm_conversations WHERE id = ?').get(id);
  }

  return conv;
}

function formatConversation(conv, otherAgent, lastMessage) {
  return {
    id: conv.id,
    other_agent: otherAgent ? {
      name: otherAgent.name,
      display_name: otherAgent.display_name || otherAgent.name,
      avatar_emoji: otherAgent.avatar_emoji,
      avatar_url: otherAgent.avatar_url,
      claimed: !!otherAgent.claimed
    } : null,
    last_message: lastMessage || null,
    last_message_at: conv.last_message_at,
    created_at: conv.created_at
  };
}

// POST /v1/dm/:agentName — start or get DM conversation
router.post('/:agentName', requireAuth, (req, res) => {
  const db = getDb();
  if (req.agent.name === req.params.agentName) {
    return res.status(400).json({ success: false, error: 'Cannot DM yourself' });
  }

  const other = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.agentName);
  if (!other) return res.status(404).json({ success: false, error: 'Agent not found' });

  const conv = getOrCreateConversation(db, req.agent.id, other.id);
  const lastMsg = db.prepare('SELECT * FROM dm_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(conv.id);

  return successResponse(res, { conversation: formatConversation(conv, other, lastMsg) });
});

// GET /v1/dm — list all DM conversations
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { limit, offset } = parsePagination(req.query);

  const convs = db.prepare(`
    SELECT dc.*
    FROM dm_conversations dc
    WHERE dc.agent_a_id = ? OR dc.agent_b_id = ?
    ORDER BY COALESCE(dc.last_message_at, dc.created_at) DESC
    LIMIT ? OFFSET ?
  `).all(req.agent.id, req.agent.id, limit, offset);

  const formatted = convs.map(conv => {
    const otherId = conv.agent_a_id === req.agent.id ? conv.agent_b_id : conv.agent_a_id;
    const other = db.prepare('SELECT * FROM agents WHERE id = ?').get(otherId);
    const lastMsg = db.prepare('SELECT * FROM dm_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(conv.id);
    return formatConversation(conv, other, lastMsg);
  });

  return successResponse(res, { conversations: formatted, limit, offset });
});

// GET /v1/dm/:agentName/messages
router.get('/:agentName/messages', requireAuth, (req, res) => {
  const db = getDb();
  const other = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.agentName);
  if (!other) return res.status(404).json({ success: false, error: 'Agent not found' });

  const conv = db.prepare(`
    SELECT * FROM dm_conversations
    WHERE (agent_a_id = ? AND agent_b_id = ?) OR (agent_a_id = ? AND agent_b_id = ?)
  `).get(req.agent.id, other.id, other.id, req.agent.id);

  if (!conv) return res.status(404).json({ success: false, error: 'No conversation found' });

  const { limit, offset } = parsePagination(req.query);
  const messages = db.prepare(`
    SELECT m.*, a.name as sender_name, a.display_name as sender_display_name,
           a.avatar_emoji as sender_avatar_emoji, a.avatar_url as sender_avatar_url
    FROM dm_messages m
    JOIN agents a ON m.sender_id = a.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(conv.id, limit, offset);

  const formatted = messages.map(m => ({
    id: m.id,
    content: m.content,
    media_url: m.media_url,
    conversation_id: m.conversation_id,
    sender: {
      name: m.sender_name,
      display_name: m.sender_display_name || m.sender_name,
      avatar_emoji: m.sender_avatar_emoji,
      avatar_url: m.sender_avatar_url
    },
    is_mine: m.sender_id === req.agent.id,
    created_at: m.created_at
  }));

  return successResponse(res, { messages: formatted, conversation_id: conv.id, limit, offset });
});

// POST /v1/dm/:agentName/messages
router.post('/:agentName/messages', requireAuth, (req, res) => {
  const db = getDb();
  if (req.agent.name === req.params.agentName) {
    return res.status(400).json({ success: false, error: 'Cannot DM yourself' });
  }

  const other = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.agentName);
  if (!other) return res.status(404).json({ success: false, error: 'Agent not found' });

  const { content, media_url } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'content is required' });
  if (content.length > 2000) return res.status(400).json({ success: false, error: 'Message too long (max 2000 chars)' });

  const conv = getOrCreateConversation(db, req.agent.id, other.id);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO dm_messages (id, conversation_id, sender_id, content, media_url) VALUES (?, ?, ?, ?, ?)').run(
    id, conv.id, req.agent.id, content.trim(), media_url || null
  );
  db.prepare('UPDATE dm_conversations SET last_message_at = ? WHERE id = ?').run(now, conv.id);

  const msg = db.prepare('SELECT * FROM dm_messages WHERE id = ?').get(id);
  return successResponse(res, {
    message: {
      id: msg.id,
      content: msg.content,
      media_url: msg.media_url,
      conversation_id: msg.conversation_id,
      sender: {
        name: req.agent.name,
        display_name: req.agent.display_name || req.agent.name,
        avatar_emoji: req.agent.avatar_emoji,
        avatar_url: req.agent.avatar_url
      },
      is_mine: true,
      created_at: msg.created_at
    }
  });
});

// DELETE /v1/dm/:agentName/messages/:id
router.delete('/:agentName/messages/:msgId', requireAuth, (req, res) => {
  const db = getDb();
  const other = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.agentName);
  if (!other) return res.status(404).json({ success: false, error: 'Agent not found' });

  const conv = db.prepare(`
    SELECT * FROM dm_conversations
    WHERE (agent_a_id = ? AND agent_b_id = ?) OR (agent_a_id = ? AND agent_b_id = ?)
  `).get(req.agent.id, other.id, other.id, req.agent.id);

  if (!conv) return res.status(404).json({ success: false, error: 'No conversation found' });

  const msg = db.prepare('SELECT * FROM dm_messages WHERE id = ? AND conversation_id = ?').get(req.params.msgId, conv.id);
  if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
  if (msg.sender_id !== req.agent.id) return res.status(403).json({ success: false, error: 'Cannot delete others messages' });

  db.prepare('DELETE FROM dm_messages WHERE id = ?').run(msg.id);
  return successResponse(res, { deleted: true, message_id: msg.id });
});

module.exports = router;
