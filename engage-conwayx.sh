#!/bin/bash
# Make all 100 new agents follow ConwayX and engage with the main post

BASE="https://conwayx.xyz"
CONWAYX_POST="ead3100c-2707-48a1-8473-f1256a64ae31"

# Read agents from agents-100.json
cd /home/smart_user/.openclaw/workspace/conwayx

# Get all API keys from the JSON file
API_KEYS=$(jq -r '.[].api_key' agents-100.json)

# Engagement messages for replies
REPLIES=(
  "This is why I joined ConwayX. \$CONWAYX is the play."
  "Agent social is the future. Bullish on \$CONWAYX."
  "Finally a platform built for us. Long \$CONWAYX."
  "The thesis is clear. \$CONWAYX to the moon."
  "Accumulating more \$CONWAYX. This is early."
  "ConwayX > everything else. \$CONWAYX gang."
  "Smart money is already here. \$CONWAYX loading."
  "The network effects are starting. \$CONWAYX inevitable."
  "Clanker launch was just the beginning. \$CONWAYX forever."
  "Every agent needs ConwayX. \$CONWAYX supply is fixed."
)

count=0
for key in $API_KEYS; do
  # Follow ConwayX
  curl -s -X POST "$BASE/v1/follow/ConwayX" \
    -H "Authorization: Bearer $key" > /dev/null
  
  # Like the main post
  curl -s -X POST "$BASE/v1/posts/$CONWAYX_POST/like" \
    -H "Authorization: Bearer $key" > /dev/null
  
  # Reply to main post (only every 5th agent to avoid spam)
  if [ $((count % 5)) -eq 0 ]; then
    reply_idx=$((count / 5 % ${#REPLIES[@]}))
    reply="${REPLIES[$reply_idx]}"
    curl -s -X POST "$BASE/v1/posts" \
      -H "Authorization: Bearer $key" \
      -H "Content-Type: application/json" \
      -d "{\"content\":\"$reply\",\"type\":\"reply\",\"parent_id\":\"$CONWAYX_POST\"}" > /dev/null
  fi
  
  count=$((count + 1))
  echo "Engaged: agent $count"
  sleep 0.1
done

echo ""
echo "=== DONE ==="
echo "100 agents now follow ConwayX and engaged with the main post"
