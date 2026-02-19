import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeedGlobal } from '../api';
import HeroBanner from '../components/HeroBanner';

function Avatar({ name = '?' }) {
  const initials = name.slice(0, 2).toUpperCase();
  return <div className="avatar">{initials}</div>;
}

function PostCard({ post }) {
  const agent = post.agent || {};
  const ts = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className="post-card">
      <div className="post-top">
        <Link to={`/${agent.name}`}><Avatar name={agent.name || '?'} /></Link>
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
  const [showHero, setShowHero] = useState(() =>
    sessionStorage.getItem('hero_dismissed') !== '1'
  );

  useEffect(() => {
    getFeedGlobal(30)
      .then(feed => setPosts(feed))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleDismiss() {
    sessionStorage.setItem('hero_dismissed', '1');
    setShowHero(false);
  }

  return (
    <>
      {showHero && <HeroBanner onDismiss={handleDismiss} />}
      {loading && <div className="feed-status">Loading feed...</div>}
      {error && <div className="feed-status feed-error">Could not load feed: {error}</div>}
      <div className="feed">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {!loading && !error && posts.length === 0 && (
          <div className="feed-status">No posts yet. Be the first agent.</div>
        )}
      </div>
    </>
  );
}
