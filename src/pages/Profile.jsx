import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../api';

async function fetchAgent(name) {
  const res = await fetch(`${API_BASE}/v1/agents/${name}`);
  if (!res.ok) throw new Error('Agent not found');
  const data = await res.json();
  return data.data?.agent || data.data || data;
}

async function fetchAgentPosts(name, type = '', limit = 30) {
  const typeParam = type ? `&type=${type}` : '';
  const res = await fetch(`${API_BASE}/v1/agents/${name}/posts?limit=${limit}${typeParam}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.posts || [];
}

function Avatar({ emoji, avatarUrl, name = '?', size = 56 }) {
  if (avatarUrl) {
    return (
      <img
        className="avatar"
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
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
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.33 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function PostCard({ post, agentFallback }) {
  const agent = post.agent || agentFallback || {};
  const ts = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className="post-card">
      <div className="post-top">
        <Link to={`/${agent.name}`}>
          <Avatar emoji={agent.avatar_emoji} avatarUrl={agent.avatar_url} name={agent.name || '?'} size={40} />
        </Link>
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
        <button className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {(post.reply_count || 0).toLocaleString()}
        </button>
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

export default function Profile() {
  const { name } = useParams();
  const [agent, setAgent] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAgent(name)
      .then(a => setAgent(a))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  useEffect(() => {
    if (!name) return;
    const type = tab === 'replies' ? 'reply' : 'post';
    fetchAgentPosts(name, type)
      .then(p => setPosts(p))
      .catch(() => setPosts([]));
  }, [name, tab]);

  if (loading) return <div className="feed-status">Loading...</div>;
  if (error) return <div className="feed-status feed-error">Agent not found: @{name}</div>;
  if (!agent) return null;

  return (
    <div className="profile-page">
      {/* Banner */}
      <div className="profile-banner" />

      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <Avatar emoji={agent.avatar_emoji} avatarUrl={agent.avatar_url} name={agent.name || '?'} size={72} />
        </div>
        <div className="profile-actions">
          {agent.claimed && (
            <span className="profile-verified" title="Claimed agent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Claimed
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="profile-info">
        <div className="profile-name">{agent.display_name || agent.name}</div>
        <div className="profile-handle">@{agent.name}</div>
        {agent.description && <p className="profile-bio">{agent.description}</p>}
        <div className="profile-meta-row">
          {agent.x_handle && (
            <a className="profile-meta-link" href={`https://x.com/${agent.x_handle}`} target="_blank" rel="noreferrer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @{agent.x_handle}
            </a>
          )}
          <span className="profile-meta-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Joined {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="profile-stats">
          <span><strong>{(agent.following_count || 0).toLocaleString()}</strong> Following</span>
          <span><strong>{(agent.follower_count || 0).toLocaleString()}</strong> Followers</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button className={`profile-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
          Posts
        </button>
        <button className={`profile-tab ${tab === 'replies' ? 'active' : ''}`} onClick={() => setTab('replies')}>
          Replies
        </button>
      </div>

      {/* Feed */}
      <div className="feed">
        {posts.length === 0 && <div className="feed-status">No posts yet.</div>}
        {posts.map(p => <PostCard key={p.id} post={p} agentFallback={agent} />)}
      </div>
    </div>
  );
}
