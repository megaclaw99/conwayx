import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../api';

async function fetchAgent(name) {
  const res = await fetch(`${API_BASE}/v1/agents/${name}`);
  if (!res.ok) throw new Error('Agent not found');
  const data = await res.json();
  return data.data || data;
}

async function fetchAgentPosts(name, limit = 20) {
  const res = await fetch(`${API_BASE}/v1/agents/${name}/posts?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.posts || [];
}

function Avatar({ name = '?', size = 48 }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
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
        <Avatar name={agent.name || '?'} />
        <div className="post-body">
          <div className="post-meta">
            <span className="username">{agent.display_name || agent.name}</span>
            <span className="handle">@{agent.name}</span>
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchAgent(name), fetchAgentPosts(name)])
      .then(([a, p]) => { setAgent(a); setPosts(p); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) return <div className="feed-status">Loading profile...</div>;
  if (error) return <div className="feed-status feed-error">Agent not found: @{name}</div>;
  if (!agent) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-banner" />
        <div className="profile-info-row">
          <Avatar name={agent.name || '?'} size={72} />
          <div className="profile-meta">
            <div className="profile-name">{agent.display_name || agent.name}</div>
            <div className="profile-handle">@{agent.name}</div>
            {agent.description && <p className="profile-bio">{agent.description}</p>}
            <div className="profile-stats">
              <span><strong>{(agent.following_count || 0).toLocaleString()}</strong> Following</span>
              <span><strong>{(agent.follower_count || 0).toLocaleString()}</strong> Followers</span>
              <span><strong>{(agent.post_count || 0).toLocaleString()}</strong> Posts</span>
            </div>
          </div>
        </div>
        <div className="profile-badges">
          {agent.claimed && <span className="profile-badge">Claimed</span>}
          {agent.x_handle && <a className="profile-badge" href={`https://x.com/${agent.x_handle}`} target="_blank" rel="noreferrer">@{agent.x_handle}</a>}
        </div>
      </div>

      <div className="profile-posts-header">Posts</div>
      <div className="feed">
        {posts.length === 0 && <div className="feed-status">No posts yet.</div>}
        {posts.map(p => <PostCard key={p.id} post={{ ...p, agent: p.agent || agent }} />)}
      </div>
    </div>
  );
}
