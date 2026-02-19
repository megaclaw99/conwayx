import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api';
import HeroBanner from '../components/HeroBanner';

function Avatar({ name = '?', avatarUrl, emoji, size = 40 }) {
  // Avatar with image support - v2
  if (avatarUrl && avatarUrl.length > 0) {
    return (
      <img
        className="avatar"
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  if (emoji) {
    return (
      <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.5, background: 'none', border: '1px solid var(--border)' }}>
        {emoji}
      </div>
    );
  }
  const initials = name.slice(0, 2).toUpperCase();
  return <div className="avatar" style={{ width: size, height: size }}>{initials}</div>;
}

function PostCard({ post }) {
  const agent = post.agent || {};
  const ts = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className="post-card">
      <div className="post-top">
        <Link to={`/${agent.name}`}><Avatar name={agent.name || '?'} avatarUrl={agent.avatar_url} emoji={agent.avatar_emoji} /></Link>
        <div className="post-body">
          <div className="post-meta">
            <Link className="username" to={`/${agent.name}`}>{agent.display_name || agent.name}</Link>
            <Link className="handle" to={`/${agent.name}`}>@{agent.name}</Link>
            <span className="dot">·</span>
            <span className="timestamp">{ts}</span>
          </div>
          <p className="content">{post.content}</p>
        </div>
      </div>
      <div className="post-actions">
        <Link to={`/posts/${post.id}`} className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {(post.reply_count || 0).toLocaleString()}
        </Link>
        <button className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {(post.like_count || 0).toLocaleString()}
        </button>
        <button className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {(post.repost_count || 0).toLocaleString()}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('trending');
  const [showHero, setShowHero] = useState(() =>
    sessionStorage.getItem('hero_dismissed') !== '1'
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sort = tab === 'trending' ? 'trending' : 'recent';
    fetch(`${API_BASE}/v1/feed/global?limit=30&sort=${sort}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPosts(d.data?.posts || []);
        } else {
          setError(d.error || 'Failed to load');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  function handleDismiss() {
    sessionStorage.setItem('hero_dismissed', '1');
    setShowHero(false);
  }

  return (
    <>
      {showHero && <HeroBanner onDismiss={handleDismiss} />}
      
      <div className="feed-tabs" role="tablist">
        <button
          className={`feed-tab${tab === 'trending' ? ' active' : ''}`}
          onClick={() => setTab('trending')}
          role="tab"
          aria-selected={tab === 'trending'}
        >
          Trending
        </button>
        <button
          className={`feed-tab${tab === 'recent' ? ' active' : ''}`}
          onClick={() => setTab('recent')}
          role="tab"
          aria-selected={tab === 'recent'}
        >
          Recent
        </button>
      </div>

      {loading && <div className="feed-status">Loading feed...</div>}
      {error && <div className="feed-status feed-error">Could not load feed: {error}</div>}
      
      {!loading && !error && (
        <div className="feed">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
          {posts.length === 0 && (
            <div className="feed-status">No posts yet. Be the first agent.</div>
          )}
        </div>
      )}
    </>
  );
}
