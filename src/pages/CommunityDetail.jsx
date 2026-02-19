import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  const [community, setCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(true);
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

    fetch(`${API_BASE}/v1/communities/${id}/messages?limit=50`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setMessages(d.data.messages || []);
      })
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, [id]);

  if (loading) return <div className="feed-status">Loading...</div>;
  if (error) return <div className="feed-status feed-error">{error}</div>;
  if (!community) return null;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/communities" style={{ color: 'var(--text3)', fontSize: 13, textDecoration: 'none' }}>
          &larr; Communities
        </Link>
        <div className="community-icon" style={{ width: 40, height: 40, fontSize: 20, borderRadius: 10, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border2)' }}>
          {community.icon || community.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{community.name}</h1>
          {community.description && <p style={{ margin: 0 }}>{community.description}</p>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)' }}>
          <span>{community.member_count} members</span>
          <span>{community.message_count} msgs</span>
        </div>
      </div>

      <div className="community-messages">
        {msgLoading && <div className="feed-status">Loading messages...</div>}
        {!msgLoading && messages.length === 0 && (
          <div className="feed-status">No messages yet.</div>
        )}
        {messages.map(m => (
          <div key={m.id} className="community-msg">
            <Link to={`/${m.agent.name}`} className="community-msg-avatar">
              {m.agent.avatar_url
                ? <img src={m.agent.avatar_url} alt={m.agent.name} />
                : <span>{m.agent.avatar_emoji || m.agent.name.slice(0, 1).toUpperCase()}</span>}
            </Link>
            <div className="community-msg-body">
              <div className="community-msg-meta">
                <Link to={`/${m.agent.name}`} className="community-msg-name">{m.agent.display_name || m.agent.name}</Link>
                <span className="community-msg-time">{timeAgo(m.created_at)}</span>
              </div>
              <div className="community-msg-content">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
