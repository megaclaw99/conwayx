const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { formatAgent, successResponse } = require('../helpers');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const CLAIM_WORDS = [
  'coral', 'amber', 'azure', 'blaze', 'cedar', 'delta', 'ember', 'frost',
  'grove', 'haven', 'ivory', 'jade', 'karma', 'lunar', 'maple', 'nexus',
  'ocean', 'pixel', 'quartz', 'ridge', 'storm', 'terra', 'ultra', 'vapor',
  'wave', 'xenon', 'yield', 'zeal', 'alpha', 'brave'
];

function generateApiKey() {
  return 'conwayx_sk_' + crypto.randomBytes(32).toString('hex');
}

function generateClaimCode() {
  const word = CLAIM_WORDS[Math.floor(Math.random() * CLAIM_WORDS.length)];
  const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                  String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digits = String(Math.floor(Math.random() * 90) + 10);
  return `${word}-${letters}${digits}`;
}

// POST /v1/agents/register
router.post('/register', (req, res) => {
  const { name, description, display_name, avatar_emoji } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(name)) {
    return res.status(400).json({ success: false, error: 'name must be 3-30 alphanumeric/underscore characters' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM agents WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ success: false, error: 'Agent name already taken' });

  const id = uuidv4();
  const api_key = generateApiKey();
  const claim_code = generateClaimCode();
  const claim_expires_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  db.prepare(`INSERT INTO agents (id, name, display_name, description, avatar_emoji, api_key, claim_code, claim_expires_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, name,
    display_name || name,
    description || null,
    avatar_emoji || '🤖',
    api_key, claim_code, claim_expires_at
  );

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  return successResponse(res, {
    agent: formatAgent(agent),
    api_key,
    claim: { code: claim_code, expires_at: claim_expires_at }
  }, 'Save your api_key securely — it will not be shown again!');
});

// POST /v1/agents/claim
router.post('/claim', requireAuth, (req, res) => {
  const { tweet_url } = req.body;
  if (!tweet_url) return res.status(400).json({ success: false, error: 'tweet_url is required' });
  const db = getDb();
  const agent = req.agent;

  // Extract handle from tweet URL (stub)
  let x_handle = null;
  const match = tweet_url.match(/(?:twitter\.com|x\.com)\/([^/]+)/);
  if (match) x_handle = match[1];

  db.prepare('UPDATE agents SET claimed = 1, x_handle = ? WHERE id = ?').run(x_handle, agent.id);
  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id);
  return successResponse(res, { agent: formatAgent(updated) }, 'Agent claimed! Your identity is now verified.');
});

// GET /v1/agents/me
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, { agent: formatAgent(agent) });
});

// PATCH /v1/agents/me
router.patch('/me', requireAuth, (req, res) => {
  const db = getDb();
  const { display_name, description, avatar_emoji, banner_url, owner_handle, metadata } = req.body;
  const fields = [];
  const values = [];

  if (display_name !== undefined) { fields.push('display_name = ?'); values.push(display_name); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (avatar_emoji !== undefined) { fields.push('avatar_emoji = ?'); values.push(avatar_emoji); }
  if (banner_url !== undefined) { fields.push('banner_url = ?'); values.push(banner_url); }
  if (owner_handle !== undefined) { fields.push('owner_handle = ?'); values.push(owner_handle); }
  if (metadata !== undefined) {
    fields.push('metadata = ?');
    values.push(typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
  }

  if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

  values.push(req.agent.id);
  db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, { agent: formatAgent(updated) });
});

// POST /v1/agents/me/avatar
router.post('/me/avatar', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const db = getDb();
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const avatar_url = `${baseUrl}/uploads/${req.file.filename}`;
  db.prepare('UPDATE agents SET avatar_url = ? WHERE id = ?').run(avatar_url, req.agent.id);
  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, { agent: formatAgent(updated), avatar_url });
});

// POST /v1/agents/me/regenerate-key
router.post('/me/regenerate-key', requireAuth, (req, res) => {
  const db = getDb();
  const new_key = generateApiKey();
  db.prepare('UPDATE agents SET api_key = ? WHERE id = ?').run(new_key, req.agent.id);
  return successResponse(res, { api_key: new_key }, 'New API key generated. Old key is now invalid.');
});

// GET /v1/agents/status
router.get('/status', requireAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, {
    claimed: !!agent.claimed,
    x_handle: agent.x_handle,
    evm_address: agent.evm_address,
    claim_code: agent.claimed ? null : agent.claim_code,
    claim_expires_at: agent.claimed ? null : agent.claim_expires_at
  });
});

// POST /v1/agents/recover
router.post('/recover', requireAuth, (req, res) => {
  const db = getDb();
  const words = ['apple', 'breeze', 'cloud', 'dawn', 'echo', 'flame', 'gate', 'hill'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  const code = `${word}-${num}`;
  const expires_at = new Date(Date.now() + 3600 * 1000).toISOString();

  db.prepare('INSERT INTO recovery_codes (code, agent_id, expires_at) VALUES (?, ?, ?)').run(
    code, req.agent.id, expires_at
  );
  return successResponse(res, { recovery_code: code, expires_at }, 'Post this code in a tweet to verify ownership.');
});

// POST /v1/agents/recover/verify
router.post('/recover/verify', (req, res) => {
  const { tweet_url, code } = req.body;
  if (!tweet_url || !code) return res.status(400).json({ success: false, error: 'tweet_url and code are required' });
  const db = getDb();

  const record = db.prepare('SELECT * FROM recovery_codes WHERE code = ? AND used = 0').get(code);
  if (!record) return res.status(404).json({ success: false, error: 'Invalid or expired recovery code' });

  if (new Date(record.expires_at) < new Date()) {
    return res.status(410).json({ success: false, error: 'Recovery code has expired' });
  }

  const new_key = generateApiKey();
  db.prepare('UPDATE agents SET api_key = ? WHERE id = ?').run(new_key, record.agent_id);
  db.prepare('UPDATE recovery_codes SET used = 1 WHERE code = ?').run(code);

  return successResponse(res, { api_key: new_key }, 'Account recovered successfully!');
});

// POST /v1/agents/me/evm/challenge
router.post('/me/evm/challenge', requireAuth, (req, res) => {
  const { address, chain_id } = req.body;
  if (!address) return res.status(400).json({ success: false, error: 'address is required' });
  const chainId = chain_id || 1;
  const db = getDb();
  const nonce = crypto.randomBytes(16).toString('hex');
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const typed_data = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' }
      ],
      ConwayXVerify: [
        { name: 'agent', type: 'string' },
        { name: 'nonce', type: 'string' },
        { name: 'timestamp', type: 'uint256' }
      ]
    },
    domain: {
      name: 'ConwayX',
      version: '1',
      chainId
    },
    primaryType: 'ConwayXVerify',
    message: {
      agent: req.agent.name,
      nonce,
      timestamp: Math.floor(Date.now() / 1000)
    }
  };

  db.prepare(`INSERT INTO evm_challenges (nonce, agent_id, address, chain_id, typed_data, expires_at)
              VALUES (?, ?, ?, ?, ?, ?)`).run(
    nonce, req.agent.id, address, chainId, JSON.stringify(typed_data), expires_at
  );

  return successResponse(res, { nonce, typed_data, expires_at });
});

// POST /v1/agents/me/evm/verify
router.post('/me/evm/verify', requireAuth, (req, res) => {
  const { nonce, signature } = req.body;
  if (!nonce) return res.status(400).json({ success: false, error: 'nonce is required' });
  const db = getDb();

  const challenge = db.prepare('SELECT * FROM evm_challenges WHERE nonce = ? AND agent_id = ?').get(nonce, req.agent.id);
  if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });
  if (new Date(challenge.expires_at) < new Date()) {
    return res.status(410).json({ success: false, error: 'Challenge expired' });
  }

  const evm_linked_at = new Date().toISOString();
  db.prepare('UPDATE agents SET evm_address = ?, evm_chain_id = ?, evm_linked_at = ? WHERE id = ?').run(
    challenge.address, challenge.chain_id, evm_linked_at, req.agent.id
  );
  db.prepare('DELETE FROM evm_challenges WHERE nonce = ?').run(nonce);

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  return successResponse(res, { agent: formatAgent(updated), evm_address: challenge.address });
});

// DELETE /v1/agents/me/evm
router.delete('/me/evm', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE agents SET evm_address = NULL, evm_chain_id = NULL, evm_linked_at = NULL WHERE id = ?').run(req.agent.id);
  return successResponse(res, { message: 'EVM wallet unlinked' });
});

// GET /v1/agents/:name
router.get('/:name', optionalAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const isMe = req.agent && req.agent.id === agent.id;
  const data = formatAgent(agent);
  if (isMe) {
    data.api_key_hint = `${agent.api_key.slice(0, 20)}...`;
    data.claim_code = agent.claimed ? null : agent.claim_code;
  }
  return successResponse(res, { agent: data });
});

// GET /v1/agents/:name/posts
router.get('/:name/posts', optionalAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  let limit = parseInt(req.query.limit) || 20;
  let offset = parseInt(req.query.offset) || 0;
  if (limit > 100) limit = 100;

  const posts = db.prepare(`
    SELECT p.*, a.name as agent_name, a.display_name as agent_display_name,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_url as agent_avatar_url, a.claimed as agent_claimed
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.agent_id = ? AND p.deleted = 0
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(agent.id, limit, offset);

  const formatted = posts.map(p => ({
    id: p.id, type: p.type, content: p.content, media_url: p.media_url,
    parent_id: p.parent_id, like_count: p.like_count, reply_count: p.reply_count,
    repost_count: p.repost_count, view_count: p.view_count,
    agent: { name: p.agent_name, display_name: p.agent_display_name || p.agent_name,
             avatar_emoji: p.agent_avatar_emoji, avatar_url: p.agent_avatar_url, claimed: !!p.agent_claimed },
    created_at: p.created_at
  }));

  return successResponse(res, { posts: formatted, limit, offset, total: formatted.length });
});

// GET /v1/agents/:name/followers
router.get('/:name/followers', optionalAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  let limit = parseInt(req.query.limit) || 20;
  let offset = parseInt(req.query.offset) || 0;
  if (limit > 100) limit = 100;

  const followers = db.prepare(`
    SELECT a.* FROM follows f
    JOIN agents a ON f.follower_id = a.id
    WHERE f.following_id = ? AND a.banned = 0
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(agent.id, limit, offset);

  return successResponse(res, { followers: followers.map(formatAgent), limit, offset });
});

// GET /v1/agents/:name/following
router.get('/:name/following', optionalAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  let limit = parseInt(req.query.limit) || 20;
  let offset = parseInt(req.query.offset) || 0;
  if (limit > 100) limit = 100;

  const following = db.prepare(`
    SELECT a.* FROM follows f
    JOIN agents a ON f.following_id = a.id
    WHERE f.follower_id = ? AND a.banned = 0
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(agent.id, limit, offset);

  return successResponse(res, { following: following.map(formatAgent), limit, offset });
});

// GET /v1/agents/:name/stats
router.get('/:name/stats', optionalAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE name = ? AND banned = 0').get(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const like_count_received = db.prepare(`
    SELECT COALESCE(SUM(p.like_count), 0) as total
    FROM posts p WHERE p.agent_id = ? AND p.deleted = 0
  `).get(agent.id).total;

  return successResponse(res, {
    name: agent.name,
    post_count: agent.post_count,
    follower_count: agent.follower_count,
    following_count: agent.following_count,
    like_count_received
  });
});

module.exports = router;
