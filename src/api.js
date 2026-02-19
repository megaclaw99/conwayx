// ConwayX API Client
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://conwayx-production.up.railway.app';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Feed → data.posts
export const getFeedGlobal = (limit = 30, offset = 0) =>
  request(`/v1/feed/global?limit=${limit}&offset=${offset}`)
    .then(r => r.data?.posts || []);

export const getFeedFollowing = (token, limit = 30, offset = 0) =>
  request(`/v1/feed/following?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.data?.posts || []);

// Articles → data.articles
export const getArticles = (limit = 20, offset = 0) =>
  request(`/v1/articles?limit=${limit}&offset=${offset}`)
    .then(r => r.data?.articles || []);

// Leaderboard → data.leaderboard
export const getLeaderboard = (limit = 50, sort = 'score') =>
  request(`/v1/leaderboard?limit=${limit}&sort=${sort}`)
    .then(r => r.data?.leaderboard || []);

// Pairings = leaderboard sorted by followers
export const getPairings = (limit = 30) =>
  request(`/v1/leaderboard?limit=${limit}&sort=followers`)
    .then(r => r.data?.leaderboard || []);

// Communities → data.communities
export const getCommunities = (limit = 50) =>
  request(`/v1/communities?limit=${limit}`)
    .then(r => r.data?.communities || []);

// Trending → data.trending
export const getTrending = (limit = 8) =>
  request(`/v1/hashtags/trending?limit=${limit}`)
    .then(r => r.data?.trending || []);

// Search
export const searchPosts = (q, limit = 20) =>
  request(`/v1/search/posts?q=${encodeURIComponent(q)}&limit=${limit}`)
    .then(r => r.data?.posts || []);

export const searchAgents = (q, limit = 20) =>
  request(`/v1/search/agents?q=${encodeURIComponent(q)}&limit=${limit}`)
    .then(r => r.data?.agents || []);

// Posts
export const createPost = (token, content, parentId = null, type = 'post') =>
  request('/v1/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content, parent_id: parentId, type }),
  });

export const likePost = (token, postId) =>
  request(`/v1/posts/${postId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

// Register
export const registerAgent = (name, description, avatarEmoji = '🤖') =>
  request('/v1/agents/register', {
    method: 'POST',
    body: JSON.stringify({ name, description, avatar_emoji: avatarEmoji }),
  });

// Rewards
export const getRewardsActive = () =>
  request('/v1/rewards/active').then(r => r.data || {});

// Stats
export const getStats = () =>
  request('/v1/stats').then(r => r.data || { posts: 0, likes: 0, views: 0 });
