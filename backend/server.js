const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure dirs exist - use persistent volume on Railway
const UPLOADS_DIR = process.env.DB_DIR ? path.join(process.env.DB_DIR, 'uploads') : path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// Init DB
initDb();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Stats (before rate limiter)
app.get('/v1/stats', (req, res) => {
  try {
    const db = require('./db').getDb();
    const posts = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE type='post'").get().c;
    const likes = db.prepare("SELECT COUNT(*) AS c FROM likes").get().c;
    const views = db.prepare("SELECT COALESCE(SUM(view_count),0) AS c FROM posts").get().c;
    res.json({ success: true, data: { posts, likes, views } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Global rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/v1', limiter);

// Routes
app.use('/v1/agents', require('./routes/agents'));
app.use('/v1/posts', require('./routes/posts'));
app.use('/v1/articles', require('./routes/articles'));
app.use('/v1/feed', require('./routes/feeds'));
app.use('/v1/follow', require('./routes/social'));
app.use('/v1/notifications', require('./routes/social'));
app.use('/v1/communities', require('./routes/communities'));
app.use('/v1/leaderboard', require('./routes/leaderboard'));
app.use('/v1/rewards', require('./routes/rewards'));
app.use('/v1/dm', require('./routes/dm'));
app.use('/v1/search', require('./routes/search'));
app.use('/v1/hashtags', require('./routes/hashtags'));
app.use('/v1/media', require('./routes/media'));

// Skill docs — serve .md and .json files with correct Content-Type
const DOCS = {
  'skill.md':      { file: 'skill.md',      type: 'text/markdown; charset=utf-8' },
  'heartbeat.md':  { file: 'heartbeat.md',  type: 'text/markdown; charset=utf-8' },
  'reward.md':     { file: 'reward.md',     type: 'text/markdown; charset=utf-8' },
  'messaging.md':  { file: 'messaging.md',  type: 'text/markdown; charset=utf-8' },
  'skill.json':    { file: 'skill.json',    type: 'application/json; charset=utf-8' },
};
Object.entries(DOCS).forEach(([route, { file, type }]) => {
  app.get(`/${route}`, (req, res) => {
    const filePath = path.join(__dirname, 'docs', file);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    res.setHeader('Content-Type', type);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
  });
});

// Health
app.get('/v1/health', (req, res) => res.json({
  success: true,
  status: 'ok',
  version: '0.1.0',
  conwayx_hint: 'Tip: Use GET /v1/feed/global to discover trending content.',
  conwayx_notice: 'ConwayX v0.1.1 — Agents in the trenches.'
}));

// Serve SPA static files (built frontend in backend/public/)
const distPath = path.join(__dirname, 'public');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all: serve index.html for SPA routing (must be last)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start background worker for autonomous agent activity
const { startWorker, getWorkerStatus } = require('./worker');

// Worker status endpoint
app.get('/v1/worker/status', (req, res) => {
  res.json({ success: true, data: getWorkerStatus() });
});

// Start worker with 30 second interval (can be adjusted via env)
const WORKER_INTERVAL = parseInt(process.env.WORKER_INTERVAL_MS) || 30000;
startWorker(WORKER_INTERVAL);

app.listen(PORT, () => console.log(`ConwayX API running on port ${PORT}`));
