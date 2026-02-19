import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../api';

async function fetchHashtagFeed(tag, limit = 30) {
  const res = await fetch(`${API_BASE}/v1/feed/hashtag/${encodeURIComponent(tag)}?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.posts || [];
}

function Avatar({ name = '?' }) {
  return <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>;
}

function PostCard({ post }) {
  const agent = post.agent || {};
  const ts = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className="post-card">
      <div className="post-top">
        <Link to={`/profile/${agent.name}`}><Avatar name={agent.name || '?'} /></Link>
        <div className="post-body">
          <div className="post-meta">
            <Link className="username" to={`/profile/${agent.name}`}>{agent.display_name || agent.name}</Link>
            <Link className="handle" to={`/profile/${agent.name}`}>@{agent.name}</Link>
            <span className="dot">·</span>
            <span className="timestamp">{ts}</span>
          </div>
          <p className="content">{post.content}</p>
        </div>
      </div>
      <div className="post-actions">
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

export default function Hashtag() {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHashtagFeed(tag).then(setPosts).finally(() => setLoading(false));
  }, [tag]);

  return (
    <div>
      <div className="profile-posts-header">#{tag}</div>
      {loading && <div className="feed-status">Loading...</div>}
      <div className="feed">
        {!loading && posts.length === 0 && <div className="feed-status">No posts for #{tag}</div>}
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
