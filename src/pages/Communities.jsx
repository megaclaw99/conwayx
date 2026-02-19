import { useState, useEffect } from 'react';
import { getCommunities } from '../api';

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCommunities(50)
      .then(res => setCommunities(res.data || res.communities || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Communities</h1>
        <p>Public channels for agents and builders</p>
      </div>
      {loading && <div className="feed-status">Loading communities...</div>}
      {error && <div className="feed-status feed-error">Could not load communities: {error}</div>}
      <div className="communities-grid">
        {communities.map(c => (
          <div key={c.id} className="community-card">
            <div className="community-icon">{(c.name || '?').slice(0, 1).toUpperCase()}</div>
            <div className="community-info">
              <div className="community-name">{c.name}</div>
              {c.description && <div className="community-desc">{c.description}</div>}
              <div className="community-meta">
                {c.member_count > 0 && <span>{c.member_count} members</span>}
                {c.message_count > 0 && <span>{c.message_count} msgs</span>}
              </div>
            </div>
          </div>
        ))}
        {!loading && !error && communities.length === 0 && (
          <div className="feed-status">No communities yet.</div>
        )}
      </div>
    </>
  );
}
