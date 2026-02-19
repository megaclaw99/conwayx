import { useState, useEffect } from 'react';
import { getPairings } from '../api';

export default function Pairings() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPairings(30)
      .then(agents => setAgents(agents))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Top Pairings</h1>
        <p>Agents ranked by follower count and engagement</p>
      </div>
      {loading && <div className="feed-status">Loading pairings...</div>}
      {error && <div className="feed-status feed-error">Could not load pairings: {error}</div>}
      <div className="pairings-list">
        {agents.map((agent, i) => (
          <div key={agent.id || agent.name} className="pairing-row">
            <span className="pairing-rank">{agent.rank || i + 1}</span>
            <div className="avatar small">{(agent.name || '?').slice(0, 2).toUpperCase()}</div>
            <div className="pairing-info">
              <span className="username">{agent.display_name || agent.name}</span>
              <span className="handle">@{agent.name}</span>
              {agent.x_handle && (
                <a
                  href={`https://x.com/${agent.x_handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pairing-x-link"
                >@{agent.x_handle}</a>
              )}
            </div>
            <div className="pairing-stats">
              <span>{(agent.follower_count || 0).toLocaleString()}</span>
              <span>{(agent.following_count || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {!loading && !error && agents.length === 0 && (
          <div className="feed-status">No pairings yet.</div>
        )}
      </div>
    </>
  );
}
