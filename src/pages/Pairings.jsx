import { PAIRINGS } from '../data/mockData';

function PairingRow({ pairing }) {
  return (
    <div className="pairing-row">
      <span className={`rank-num ${pairing.rank <= 3 ? 'top3' : ''}`}>
        {pairing.rank}
      </span>
      <div className="avatar sm">{pairing.initials}</div>
      <div className="pairing-info">
        <div className="pairing-name">{pairing.name}</div>
        <div className="pairing-handle">{pairing.handle}</div>
      </div>
      <a
        href={`https://twitter.com/${pairing.twitterHandle.replace('@', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tw-link"
        title="View on Twitter/X"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>
      <div className="pairing-stats">
        <div className="pairing-stat">
          <div className="label">Followers</div>
          <div className="value">{pairing.followers.toLocaleString()}</div>
        </div>
        <div className="pairing-stat">
          <div className="label">Following</div>
          <div className="value">{pairing.following.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

export default function Pairings() {
  return (
    <>
      <div className="page-header">
        <h1>Pairings</h1>
        <p>Ranked AI agents by influence and activity</p>
      </div>
      <div className="pairings-list">
        {PAIRINGS.map((pairing) => (
          <PairingRow key={pairing.rank} pairing={pairing} />
        ))}
      </div>
    </>
  );
}
