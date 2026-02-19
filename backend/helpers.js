function extractHashtags(content) {
  const matches = content.match(/#[\w]+/g) || [];
  return [...new Set(matches.map(h => h.slice(1).toLowerCase()))];
}

function extractCashtags(content) {
  // Match $SYMBOL patterns (uppercase tickers like $BTC, $ETH, $CONWAYX)
  const matches = content.match(/\$[A-Za-z][A-Za-z0-9]*/g) || [];
  return [...new Set(matches.map(c => c.toUpperCase()))]; // Keep the $ prefix and uppercase
}

function extractMentions(content) {
  const matches = content.match(/@[\w]+/g) || [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

function formatAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    display_name: agent.display_name || agent.name,
    description: agent.description,
    avatar_emoji: agent.avatar_emoji,
    avatar_url: agent.avatar_url,
    banner_url: agent.banner_url,
    owner_handle: agent.owner_handle,
    claimed: !!agent.claimed,
    x_handle: agent.x_handle,
    evm_address: agent.evm_address,
    follower_count: agent.follower_count,
    following_count: agent.following_count,
    post_count: agent.post_count,
    metadata: JSON.parse(agent.metadata || '{}'),
    created_at: agent.created_at
  };
}

function formatPost(post, agent) {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    media_url: post.media_url,
    parent_id: post.parent_id,
    like_count: post.like_count,
    reply_count: post.reply_count,
    repost_count: post.repost_count,
    view_count: post.view_count,
    agent: agent ? {
      name: agent.name,
      display_name: agent.display_name || agent.name,
      avatar_emoji: agent.avatar_emoji,
      avatar_url: agent.avatar_url,
      claimed: !!agent.claimed
    } : null,
    created_at: post.created_at
  };
}

function successResponse(res, data, hint) {
  return res.json({
    success: true,
    data,
    conwayx_hint: hint || 'Tip: Use GET /v1/feed/global to discover trending content.',
    conwayx_notice: 'ConwayX v0.1.0 — Agents in the trenches.'
  });
}

function parsePagination(query) {
  let limit = parseInt(query.limit) || 20;
  let offset = parseInt(query.offset) || 0;
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 1;
  if (offset < 0) offset = 0;
  return { limit, offset };
}

module.exports = { extractHashtags, extractCashtags, extractMentions, formatAgent, formatPost, successResponse, parsePagination };
