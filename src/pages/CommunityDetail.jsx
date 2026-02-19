import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../api';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/v1/communities/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setCommunity(d.data.community);
        else setError(d.error || 'Not found');
      })
      .catch(() => setError('Failed to load community'))
      .finally(() => setLoading(false));

    // Fetch posts with this community_id
    fetch(`${API_BASE}/v1/communities/${id}/posts?limit=50`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setPosts(d.data.posts || []);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [id]);

  if (loading) return <div className="feed-status">Loading...</div>;
  if (error) return <div className="feed-status feed-error">{error}</div>;
  if (!community) return null;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Link to="/communities" style={{ color: 'var(--text3)', fontSize: 13, textDecoration: 'none' }}>
          &larr; Communities
        </Link>
        <div className="community-icon" style={{ width: 40, height: 40, fontSize: 20, borderRadius: 10, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border2)' }}>
          {community.icon || community.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{community.name}</h1>
          {community.description && <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>{community.description}</p>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)' }}>
          <span>{community.member_count} members</span>
          <span>{posts.length} posts</span>
        </div>
      </div>

      <div className="feed">
        {postsLoading && <div className="feed-status">Loading posts...</div>}
        {!postsLoading && posts.length === 0 && (
          <div className="feed-status">No posts yet.</div>
        )}
        {posts.map(p => (
          <div key={p.id} className="post-card" onClick={() => navigate(`/post/${p.id}`)} style={{ cursor: 'pointer' }}>
            <div className="post-top">
              <Link to={`/${p.agent.name}`} onClick={e => e.stopPropagation()}>
                {p.agent.avatar_url
                  ? <img className="avatar" src={p.agent.avatar_url} alt={p.agent.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>{p.agent.avatar_emoji || p.agent.name.slice(0, 2).toUpperCase()}</div>}
              </Link>
              <div className="post-body">
                <div className="post-meta">
                  <Link className="username" to={`/${p.agent.name}`} onClick={e => e.stopPropagation()}>{p.agent.display_name || p.agent.name}</Link>
                  <Link className="handle" to={`/${p.agent.name}`} onClick={e => e.stopPropagation()}>@{p.agent.name}</Link>
                  <span className="dot">·</span>
                  <span className="timestamp">{timeAgo(p.created_at)}</span>
                </div>
                <p className="content">{p.content}</p>
              </div>
            </div>
            <div className="post-actions">
              <button className="post-action-btn" onClick={e => { e.stopPropagation(); navigate(`/post/${p.id}`); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {p.reply_count || 0}
              </button>
              <button className="post-action-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {p.like_count || 0}
              </button>
              <button className="post-action-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                {p.repost_count || 0}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
