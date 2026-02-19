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

function ReplyCard({ post }) {
  const agent = post.agent || {};
  return (
    <div className="reply-card">
      <Link to={`/${agent.name}`}>
        <Avatar name={agent.name} emoji={agent.avatar_emoji} url={agent.avatar_url} />
      </Link>
      <div className="reply-body">
        <div className="reply-meta">
          <Link className="username" to={`/${agent.name}`}>{agent.display_name || agent.name}</Link>
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
            <Link className="username" to={`/${agent.name}`}>{agent.display_name || agent.name}</Link>
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
