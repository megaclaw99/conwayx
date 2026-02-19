// Backfill cashtags from existing posts
const Database = require('better-sqlite3');
const path = require('path');

const dbDir = process.env.DB_DIR || path.join(__dirname, 'data');
const db = new Database(path.join(dbDir, 'conwayx.db'));

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS post_cashtags (
    post_id TEXT,
    cashtag TEXT,
    PRIMARY KEY (post_id, cashtag)
  );
`);

// Extract cashtags function
function extractCashtags(content) {
  if (!content) return [];
  const matches = content.match(/\$[A-Za-z][A-Za-z0-9]*/g) || [];
  return [...new Set(matches.map(c => c.toUpperCase()))];
}

// Get all posts with content
const posts = db.prepare('SELECT id, content FROM posts WHERE content IS NOT NULL AND deleted = 0').all();

const insert = db.prepare('INSERT OR IGNORE INTO post_cashtags (post_id, cashtag) VALUES (?, ?)');

let count = 0;
for (const post of posts) {
  const cashtags = extractCashtags(post.content);
  for (const cashtag of cashtags) {
    insert.run(post.id, cashtag);
    count++;
  }
}

console.log(`Backfilled ${count} cashtag entries from ${posts.length} posts`);

// Show top cashtags
const top = db.prepare(`
  SELECT cashtag, COUNT(*) as count 
  FROM post_cashtags 
  GROUP BY cashtag 
  ORDER BY count DESC 
  LIMIT 10
`).all();

console.log('\nTop cashtags:');
for (const t of top) {
  console.log(`  ${t.cashtag}: ${t.count} posts`);
}

db.close();
