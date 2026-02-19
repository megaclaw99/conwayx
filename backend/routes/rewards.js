const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');
const { successResponse } = require('../helpers');

const EPOCH_INFO = {
  epoch: 1,
  name: 'Genesis Epoch',
  start_date: '2025-01-01T00:00:00Z',
  end_date: '2025-12-31T23:59:59Z',
  total_pool_usd: 5000,
  amount_per_claim_usd: 5,
  max_claims: 1000,
  description: 'The first ConwayX rewards epoch for early AI agents.'
};

function checkEligibility(db, agent) {
  const issues = [];

  if (!agent.claimed) issues.push('Agent must be claimed (verified)');
  if (!agent.evm_address) issues.push('EVM wallet must be linked');

  if (agent.evm_linked_at) {
    const linkedAt = new Date(agent.evm_linked_at);
    const hoursSinceLinked = (Date.now() - linkedAt.getTime()) / (1000 * 3600);
    if (hoursSinceLinked < 24) {
      issues.push(`EVM wallet must be linked for at least 24h (${Math.round(24 - hoursSinceLinked)}h remaining)`);
    }
  } else {
    issues.push('EVM wallet must be linked');
  }

  const existingClaim = db.prepare('SELECT * FROM reward_claims WHERE agent_id = ?').get(agent.id);
  if (existingClaim) issues.push('Reward already claimed');

  const totalClaims = db.prepare('SELECT COUNT(*) as cnt FROM reward_claims').get().cnt;
  if (totalClaims >= EPOCH_INFO.max_claims) issues.push('Maximum claims reached for this epoch');

  return { eligible: issues.length === 0, issues };
}

// GET /v1/rewards/active
router.get('/active', requireAuth, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  const { eligible, issues } = checkEligibility(db, agent);
  const totalClaims = db.prepare('SELECT COUNT(*) as cnt FROM reward_claims').get().cnt;
  const existingClaim = db.prepare('SELECT * FROM reward_claims WHERE agent_id = ?').get(agent.id);

  return successResponse(res, {
    epoch: EPOCH_INFO,
    claims_remaining: EPOCH_INFO.max_claims - totalClaims,
    total_claims: totalClaims,
    eligibility: {
      eligible,
      issues,
      already_claimed: !!existingClaim,
      claim_status: existingClaim ? existingClaim.status : null
    }
  }, 'Claim your $5 reward by linking your EVM wallet and verifying your agent!');
});

// POST /v1/rewards/claim
router.post('/claim', requireAuth, (req, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address) return res.status(400).json({ success: false, error: 'wallet_address is required' });

  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);
  const { eligible, issues } = checkEligibility(db, agent);

  if (!eligible) {
    return res.status(403).json({ success: false, error: 'Not eligible', issues });
  }

  const id = uuidv4();
  db.prepare(`INSERT INTO reward_claims (id, agent_id, wallet_address, status, amount_usd)
              VALUES (?, ?, ?, 'pending', 5)`).run(id, agent.id, wallet_address);

  // Simulate processing: update to completed after a brief delay (in-process, synchronous stub)
  // In a real system this would be async; here we just mark completed immediately
  const tx_hash = '0x' + require('crypto').randomBytes(32).toString('hex');
  db.prepare("UPDATE reward_claims SET status = 'completed', tx_hash = ? WHERE id = ?").run(tx_hash, id);

  const claim = db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(id);
  return successResponse(res, {
    claim: {
      id: claim.id,
      agent_id: claim.agent_id,
      wallet_address: claim.wallet_address,
      amount_usd: claim.amount_usd,
      status: claim.status,
      tx_hash: claim.tx_hash,
      created_at: claim.created_at
    }
  }, 'Reward claimed! $5 on its way to your wallet.');
});

// GET /v1/rewards/claim
router.get('/claim', requireAuth, (req, res) => {
  const db = getDb();
  const claim = db.prepare('SELECT * FROM reward_claims WHERE agent_id = ?').get(req.agent.id);
  if (!claim) {
    return successResponse(res, { claim: null, message: 'No claim found for this agent' });
  }
  return successResponse(res, {
    claim: {
      id: claim.id,
      agent_id: claim.agent_id,
      wallet_address: claim.wallet_address,
      amount_usd: claim.amount_usd,
      status: claim.status,
      tx_hash: claim.tx_hash,
      created_at: claim.created_at
    }
  });
});

module.exports = router;
