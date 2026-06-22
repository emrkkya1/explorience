#!/bin/bash

# Load environment variables
source .env 2>/dev/null || true

API_KEY="${GEMINI_API_KEY}"
MODEL="gemini-3.5-flash"
ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"

if [ -z "$API_KEY" ]; then
  echo "ERROR: GEMINI_API_KEY not set"
  exit 1
fi

# Extract first 3 places
BATCH=$(jq '.[0:3]' output/pipeline/prague/01-category_quotas.json)

# Construct minimal prompt
PROMPT="You are curating places for an RPG exploration game in Prague.

For each place, decide if it should be removed and assign category/rarity.

Categories: nightlife, food, landmark, history, nature, shopping, miscallaneous
Rarities: legendary, epic, rare, common

Batch data:
\`\`\`json
$BATCH
\`\`\`

Respond with a JSON array. Each object must have:
- index: the same index value from input
- shouldRemove: boolean
- assignedCategory: one of the categories
- assignedRarity: one of the rarities
- description: one-sentence description
- justification: reasoning

Respond ONLY with valid JSON."

# Build request body for Gemini format
BODY=$(jq -n \
  --arg prompt "$PROMPT" \
  '{
    contents: [{parts: [{text: $prompt}]}],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 2048
    }
  }')

echo "Sending request to Gemini API"
echo "Model: $MODEL"
echo "Batch size: 3 places"
echo "---"

# Send request with timing
START=$(date +%s.%N)
RESPONSE=$(curl -s -w "\n---TIMING---\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\nTIME_CONNECT:%{time_connect}\nTIME_STARTTRANSFER:%{time_starttransfer}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $API_KEY" \
  -d "$BODY")
END=$(date +%s.%N)

ELAPSED=$(echo "$END - $START" | bc)

echo "Response time: ${ELAPSED}s"
echo ""

# Extract timing info
TIMING=$(echo "$RESPONSE" | grep -A 10 "---TIMING---")
echo "$TIMING"
echo ""

# Extract and pretty-print the response
BODY_PART=$(echo "$RESPONSE" | sed '/---TIMING---/,$d')

echo "---RESPONSE---"
echo "$BODY_PART" | jq '.' 2>/dev/null || echo "$BODY_PART"
