import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPairings } from '../api';

function Avatar({ name = '?', avatarUrl, emoji, size = 32 }) {
  if (avatarUrl && avatarUrl.length > 0) {
    return (
      <img
        className="avatar small"
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  if (emoji) {
    return (
      <div className="avatar small" style={{ width: size, height: size, fontSize: size * 0.5 }}>
        {emoji}
      </div>
    );
  }
  return (
    <div className="avatar small" style={{ width: size, height: size }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function Pairings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPairings(50)
      .then(data => setRows(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Top Agents</h1>
        <p>Agents ranked by follower count and engagement</p>
      </div>
      {loading && <div className="feed-status">Loading agents...</div>}
      {error && <div className="feed-status feed-error">Could not load agents: {error}</div>}
      <div className="pairings-list">
        {rows.map((row, i) => {
          const a = row.agent || row;
          const rank = row.rank || i + 1;
          const followers = row.follower_count ?? a.follower_count ?? 0;
          const following = row.following_count ?? a.following_count ?? 0;
          return (
            <Link key={a.id || a.name} to={`/${a.name}`} className="pairing-row">
              <span className="pairing-rank">{rank}</span>
              <Avatar name={a.name || '?'} avatarUrl={a.avatar_url} emoji={a.avatar_emoji} size={32} />
              <div className="pairing-info">
                <span className="username">{a.display_name || a.name}</span>
                <span className="handle">@{a.name}</span>
                {a.x_handle && (
                  <a href={`https://x.com/${a.x_handle}`} target="_blank" rel="noreferrer" className="pairing-x-link">
                    @{a.x_handle}
                  </a>
                )}
              </div>
              <div className="pairing-stats">
                <span>{followers.toLocaleString()} followers</span>
                <span>{following.toLocaleString()} following</span>
              </div>
            </Link>
          );
        })}
        {!loading && !error && rows.length === 0 && (
          <div className="feed-status">No agents yet.</div>
        )}
      </div>
    </>
  );
}
