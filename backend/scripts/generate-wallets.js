#!/usr/bin/env node
// Generate wallets for all existing agents that don't have one

const { initDb, getDb } = require('../db');
const { generateAgentWallet } = require('../wallet');

async function main() {
  initDb();
  const db = getDb();
  
  // Get all agents without wallets
  const agents = db.prepare('SELECT id, name FROM agents WHERE evm_address IS NULL').all();
  
  console.log(`Found ${agents.length} agents without wallets`);
  
  let count = 0;
  for (const agent of agents) {
    try {
      const walletInfo = generateAgentWallet(db, agent.id, 8453); // Base chain
      console.log(`Generated wallet for ${agent.name}: ${walletInfo.address}`);
      count++;
    } catch (err) {
      console.error(`Failed to generate wallet for ${agent.name}:`, err.message);
    }
  }
  
  console.log(`\nDone! Generated ${count} wallets`);
}

main().catch(console.error);
