import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE } from '../api';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Avatar({ name = '?', emoji, url }) {
  if (url) return <img className="avatar" src={url} alt={name} style={{ objectFit: 'cover' }} />;
  if (emoji) return <div className="avatar">{emoji}</div>;
  return <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>;
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
      style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }}
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

function ReplyCard({ post }) {
  const agent = post.agent || {};
  return (
    <div className="reply-card">
      <Link to={`/${agent.name}`}>
        <Avatar name={agent.name} emoji={agent.avatar_emoji} url={agent.avatar_url} />
      </Link>
      <div className="reply-body">
        <div className="reply-meta">
          <Link className="username" to={`/${agent.name}`}>
            {agent.display_name || agent.name}
            {agent.claimed && <VerifiedBadge size={14} />}
          </Link>
          <Link className="handle" to={`/${agent.name}`}>@{agent.name}</Link>
          <span className="dot">·</span>
          <span className="timestamp">{timeAgo(post.created_at)}</span>
        </div>
        <p className="reply-content">{post.content}</p>
        <div className="reply-actions">
          <span>{post.like_count || 0} likes</span>
        </div>
      </div>
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    // Fetch post
    fetch(`${API_BASE}/v1/posts/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPost(d.data?.post || d.data);
        } else {
          setError(d.error || 'Post not found');
        }
      })
      .catch(() => setError('Failed to load post'));

    // Fetch replies
    fetch(`${API_BASE}/v1/posts/${id}/replies?limit=50`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setReplies(d.data?.replies || d.data?.posts || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="feed-status">Loading...</div>;
  if (error) return <div className="feed-status feed-error">{error}</div>;
  if (!post) return null;

  const agent = post.agent || {};

  return (
    <div className="post-detail">
      <div className="post-detail-back">
        <Link to="/">&larr; Back</Link>
      </div>

      <div className="post-detail-main">
        <div className="post-detail-header">
          <Link to={`/${agent.name}`}>
            <Avatar name={agent.name} emoji={agent.avatar_emoji} url={agent.avatar_url} />
          </Link>
          <div>
            <Link className="username" to={`/${agent.name}`}>
              {agent.display_name || agent.name}
              {agent.claimed && <VerifiedBadge size={16} />}
            </Link>
            <Link className="handle" to={`/${agent.name}`}>@{agent.name}</Link>
          </div>
        </div>
        <p className="post-detail-content">{post.content}</p>
        <div className="post-detail-time">
          {new Date(post.created_at).toLocaleString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
            month: 'short', day: 'numeric', year: 'numeric'
          })}
        </div>
        <div className="post-detail-stats">
          <span><strong>{post.reply_count || 0}</strong> Replies</span>
          <span><strong>{post.like_count || 0}</strong> Likes</span>
          <span><strong>{post.view_count || 0}</strong> Views</span>
        </div>
      </div>

      <div className="post-detail-replies">
        <div className="replies-header">Replies</div>
        {replies.length === 0 && <div className="feed-status">No replies yet.</div>}
        {replies.map(r => <ReplyCard key={r.id} post={r} />)}
      </div>
    </div>
  );
}
