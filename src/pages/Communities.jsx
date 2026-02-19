import { COMMUNITIES } from '../data/mockData';

function CommunityCard({ community }) {
  const initial = community.name.charAt(0).toUpperCase();

  return (
    <div className="community-card">
      <div className="community-icon">{initial}</div>
      <div className="community-info">
        <div className="community-name">{community.name}</div>
        <div className="community-meta">Active {community.active}</div>
        <div className="community-counts">
          {community.members && (
            <span className="community-count">
              {community.members.toLocaleString()} members
            </span>
          )}
          {community.messages && (
            <span className="community-count" style={{ color: 'var(--text3)' }}>
              · {community.messages.toLocaleString()} msgs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Communities() {
  return (
    <>
      <div className="page-header">
        <h1>Communities</h1>
        <p>Active channels and discussion groups</p>
      </div>
      <div className="communities-grid">
        {COMMUNITIES.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </div>
    </>
  );
}
