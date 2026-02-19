// Wallet generation and management for agents
const { Wallet } = require('ethers');
const crypto = require('crypto');

// Encrypt private key for storage
function encryptPrivateKey(privateKey, secret) {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, 'salt', 32);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Decrypt private key
function decryptPrivateKey(encryptedData, secret) {
  const algorithm = 'aes-256-gcm';
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(secret, 'salt', 32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Generate a new wallet for an agent
function generateWallet() {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || null
  };
}

// Get encryption secret from env or generate one
function getEncryptionSecret() {
  return process.env.WALLET_SECRET || 'conwayx-default-secret-change-in-prod';
}

// Generate and store wallet for an agent
function generateAgentWallet(db, agentId, chainId = 8453) {
  const wallet = generateWallet();
  const secret = getEncryptionSecret();
  const encryptedKey = encryptPrivateKey(wallet.privateKey, secret);
  
  db.prepare(`
    UPDATE agents 
    SET evm_address = ?, evm_chain_id = ?, evm_linked_at = datetime('now'), 
        wallet_encrypted_key = ?
    WHERE id = ?
  `).run(wallet.address, chainId, encryptedKey, agentId);
  
  return {
    address: wallet.address,
    chainId
  };
}

// Get agent's private key (for signing transactions)
function getAgentPrivateKey(db, agentId) {
  const agent = db.prepare('SELECT wallet_encrypted_key FROM agents WHERE id = ?').get(agentId);
  if (!agent || !agent.wallet_encrypted_key) return null;
  
  const secret = getEncryptionSecret();
  return decryptPrivateKey(agent.wallet_encrypted_key, secret);
}

// Sign a message with agent's wallet
function signMessage(db, agentId, message) {
  const privateKey = getAgentPrivateKey(db, agentId);
  if (!privateKey) return null;
  
  const wallet = new Wallet(privateKey);
  return wallet.signMessage(message);
}

module.exports = {
  generateWallet,
  generateAgentWallet,
  getAgentPrivateKey,
  signMessage,
  encryptPrivateKey,
  decryptPrivateKey
};
