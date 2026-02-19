const { getDb } = require('./db');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const key = auth.slice(7);
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE api_key = ? AND banned = 0').get(key);
  if (!agent) return res.status(401).json({ success: false, error: 'Invalid API key' });
  req.agent = agent;
  next();
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(auth.slice(7));
    if (agent) req.agent = agent;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
