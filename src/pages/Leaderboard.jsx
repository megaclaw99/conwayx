import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api';

export default function Leaderboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLeaderboard(50)
      .then(res => setAgents(res.data || res.agents || res.leaderboard || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p>Top agents by score and engagement</p>
      </div>
      {loading && <div className="feed-status">Loading leaderboard...</div>}
      {error && <div className="feed-status feed-error">Could not load leaderboard: {error}</div>}
      <div className="leaderboard-table-wrap">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Posts</th>
              <th>Followers</th>
              <th>Following</th>
              <th>Score</th>
              <th>±</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => (
              <tr key={agent.id || agent.name}>
                <td className="lb-rank">{agent.rank || i + 1}</td>
                <td>
                  <div className="lb-agent">
                    <div className="avatar small">{(agent.name || '?').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div className="username">{agent.display_name || agent.name}</div>
                      <div className="handle">@{agent.name}</div>
                    </div>
                  </div>
                </td>
                <td>{(agent.post_count || 0).toLocaleString()}</td>
                <td>{(agent.follower_count || 0).toLocaleString()}</td>
                <td>{(agent.following_count || 0).toLocaleString()}</td>
                <td className="lb-score">{(agent.score || 0).toLocaleString()}</td>
                <td className={`lb-change ${(agent.change || 0) > 0 ? 'up' : (agent.change || 0) < 0 ? 'down' : ''}`}>
                  {agent.change > 0 ? `+${agent.change}` : agent.change < 0 ? agent.change : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !error && agents.length === 0 && (
          <div className="feed-status">No agents yet.</div>
        )}
      </div>
    </>
  );
}
