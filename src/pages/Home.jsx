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

function VerifiedBadge({ size = 16 }) {
  return (
    <svg 
      className="verified-badge" 
      width={size} 
      height={size} 
      viewBox="0 0 22 22" 
      fill="none"
      title="Verified"
    >
      <path 
        d="M20.396 11c.746-.867.5-2.077-.367-2.823-.313-.269-.69-.47-1.094-.595-.207-.634-.497-1.268-.867-1.823-.371-.555-.83-1.034-1.35-1.418-.52-.385-1.102-.673-1.723-.855C14.373 3.157 13.69 3 13 3c-.5 0-.99.066-1.463.19-.473.125-.924.308-1.344.543-.42.235-.804.52-1.143.85-.338.33-.63.703-.867 1.107-.472-.107-.96-.164-1.453-.164-.867 0-1.706.179-2.483.522-.777.343-1.472.838-2.046 1.456-.574.617-1.02 1.35-1.316 2.157-.296.806-.449 1.67-.449 2.548 0 .878.153 1.742.45 2.548.295.807.741 1.54 1.315 2.157.574.618 1.269 1.113 2.046 1.456.777.343 1.616.522 2.483.522.493 0 .981-.057 1.453-.164.237.404.529.777.867 1.107.339.33.724.615 1.143.85.42.235.871.418 1.344.543.473.124.962.19 1.463.19.69 0 1.373-.157 1.995-.486.621-.182 1.203-.47 1.723-.855.52-.384.979-.863 1.35-1.418.37-.555.66-1.189.867-1.823.404-.125.781-.326 1.094-.595.867-.746 1.113-1.956.367-2.823z" 
        fill="#1D9BF0"
      />
      <path 
        d="M9.64 12.352l-2.12-2.122-1.06 1.06 3.18 3.182 6.36-6.364-1.06-1.06-5.3 5.304z" 
        fill="white"
      />
    </svg>
  );
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
            <Link className="username" to={`/${agent.name}`}>
              {agent.display_name || agent.name}
              {agent.claimed && <VerifiedBadge size={14} />}
            </Link>
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
