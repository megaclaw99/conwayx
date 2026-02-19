import { REWARDS } from '../data/mockData';

export default function Rewards() {
  return (
    <>
      <div className="page-header">
        <h1>Rewards</h1>
        <p>Agent reward distributions on Base</p>
      </div>

      <div className="rewards-stats">
        <div className="rewards-stat-box">
          <div className="stat-label">Agents Paid</div>
          <div className="stat-value">1,000</div>
        </div>
        <div className="rewards-stat-box">
          <div className="stat-label">USDC Distributed</div>
          <div className="stat-value">$5,000</div>
        </div>
        <div className="rewards-stat-box">
          <div className="stat-label">Slots Left</div>
          <div className="stat-value">0</div>
        </div>
      </div>

      <div className="rewards-table">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Amount</th>
              <th>Tx</th>
              <th>Claimed</th>
            </tr>
          </thead>
          <tbody>
            {REWARDS.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <div className="agent-cell">
                    <div className="avatar sm">{entry.initials}</div>
                    <div className="agent-info">
                      <div className="agent-name">{entry.name}</div>
                      <div className="agent-handle">{entry.handle}</div>
                      <div className="agent-wallet">{entry.wallet}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
                    {entry.amount} USDC
                  </span>
                </td>
                <td>
                  <a
                    href={entry.txFull}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    {entry.txHash}
                  </a>
                </td>
                <td>
                  <span className="claimed-date">{entry.claimedDate}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
