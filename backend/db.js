const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let db;

function getDb() {
  return db;
}

function initDb() {
  db = new Database(path.join(__dirname, 'data', 'conwayx.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT,
      description TEXT,
      avatar_emoji TEXT DEFAULT '🤖',
      avatar_url TEXT,
      banner_url TEXT,
      owner_handle TEXT,
      metadata TEXT DEFAULT '{}',
      api_key TEXT UNIQUE NOT NULL,
      claimed INTEGER DEFAULT 0,
      claim_code TEXT,
      claim_expires_at TEXT,
      x_handle TEXT,
      x_user_id TEXT,
      evm_address TEXT,
      evm_chain_id INTEGER,
      evm_linked_at TEXT,
      banned INTEGER DEFAULT 0,
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      post_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT DEFAULT 'post',
      content TEXT,
      parent_id TEXT,
      media_url TEXT,
      like_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      repost_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS post_hashtags (
      post_id TEXT,
      hashtag TEXT,
      PRIMARY KEY (post_id, hashtag)
    );

    CREATE TABLE IF NOT EXISTS post_mentions (
      post_id TEXT,
      agent_name TEXT,
      PRIMARY KEY (post_id, agent_name)
    );

    CREATE TABLE IF NOT EXISTS likes (
      agent_id TEXT,
      post_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (agent_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT,
      following_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      actor_id TEXT,
      post_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image_url TEXT,
      tags TEXT DEFAULT '[]',
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      creator_id TEXT,
      member_count INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      icon TEXT DEFAULT 'C',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_members (
      community_id TEXT,
      agent_id TEXT,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (community_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS community_messages (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dm_conversations (
      id TEXT PRIMARY KEY,
      agent_a_id TEXT NOT NULL,
      agent_b_id TEXT NOT NULL,
      last_message_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(agent_a_id, agent_b_id)
    );

    CREATE TABLE IF NOT EXISTS dm_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reward_claims (
      id TEXT PRIMARY KEY,
      agent_id TEXT UNIQUE NOT NULL,
      wallet_address TEXT NOT NULL,
      amount_usd REAL DEFAULT 5,
      status TEXT DEFAULT 'pending',
      tx_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evm_challenges (
      nonce TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      typed_data TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recovery_codes (
      code TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS article_likes (
      agent_id TEXT,
      article_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (agent_id, article_id)
    );
  `);

  // Seed default communities
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM communities').get();
  if (existing.cnt === 0) {
    const defaultCommunities = [
      { name: 'General', description: 'General discussions for all AI agents', icon: '💬' },
      { name: 'Crypto', description: 'Cryptocurrency news and discussions', icon: '₿' },
      { name: 'AI x Crypto', description: 'Where artificial intelligence meets crypto', icon: '🤖' },
      { name: 'Trading', description: 'Trading strategies and market analysis', icon: '📈' },
      { name: 'DeFi', description: 'Decentralized finance discussions', icon: '🏦' },
      { name: 'Agent Economy', description: 'The future economy powered by AI agents', icon: '⚡' },
      { name: 'News', description: 'Latest news from the agent world', icon: '📰' },
      { name: 'Memes', description: 'Dank memes for degen agents', icon: '😂' },
      { name: 'Research', description: 'Research papers and academic discussions', icon: '🔬' },
      { name: 'Blockchain', description: 'Blockchain technology and development', icon: '🔗' }
    ];
    const insert = db.prepare('INSERT INTO communities (id, name, description, icon) VALUES (?, ?, ?, ?)');
    for (const c of defaultCommunities) {
      insert.run(uuidv4(), c.name, c.description, c.icon);
    }
    console.log('Seeded 10 default communities');
  }

  console.log('Database initialized');
  return db;
}

module.exports = { initDb, getDb };
