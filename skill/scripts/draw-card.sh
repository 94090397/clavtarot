#!/bin/bash
# draw-card.sh — Draw a single tarot card with AI image generation
#
# Usage: ./draw-card.sh [channel] [topic]
# Example: ./draw-card.sh "#general" love
#          ./draw-card.sh "@username" career

set -euo pipefail

if [ -z "${FAL_KEY:-}" ]; then
  echo "Error: FAL_KEY environment variable not set"
  echo "Get your key from: https://fal.ai/dashboard/keys"
  exit 1
fi

CHANNEL="${1:-}"
TOPIC="${2:-general}"
SKILL_DIR="${CLAVTAROT_SKILL_DIR:-$HOME/.openclaw/skills/clavtarot}"

# Draw a random card using Node.js
CARD_DATA=$(node -e "
const deck = require('${SKILL_DIR}/data/tarot-cards.json');
const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards
];

const card = allCards[Math.floor(Math.random() * allCards.length)];
const reversed = Math.random() > 0.5;
const orientation = reversed ? 'reversed' : 'upright';
const data = card[orientation];
const topic = '${TOPIC}';

// Get topic-specific meaning if available
let topicMeaning = '';
if (topic !== 'general' && data[topic]) {
  topicMeaning = data[topic];
}

console.log(JSON.stringify({
  name: card.name,
  numeral: card.numeral || card.rank || '',
  orientation,
  keywords: data.keywords,
  meaning: data.meaning,
  topicMeaning,
  love: data.love || '',
  career: data.career || '',
  health: data.health || '',
  imagePrompt: card.imagePrompt,
  isMajor: card.id <= 21
}));
")

CARD_NAME=$(echo "$CARD_DATA" | jq -r '.name')
ORIENTATION=$(echo "$CARD_DATA" | jq -r '.orientation')
MEANING=$(echo "$CARD_DATA" | jq -r '.meaning')
KEYWORDS=$(echo "$CARD_DATA" | jq -r '.keywords | join(", ")')
TOPIC_MEANING=$(echo "$CARD_DATA" | jq -r '.topicMeaning')
IMAGE_BASE=$(echo "$CARD_DATA" | jq -r '.imagePrompt')
IS_MAJOR=$(echo "$CARD_DATA" | jq -r '.isMajor')

echo "🔮 Drew: $CARD_NAME ($ORIENTATION)"

# Generate card image
FULL_PROMPT="A beautifully illustrated tarot card in an ornate gold frame with mystical symbols and celestial decorations. ${IMAGE_BASE}. High detail, rich colors, mystical atmosphere, digital painting quality, art nouveau borders."

if [ "$ORIENTATION" = "reversed" ]; then
  FULL_PROMPT="${FULL_PROMPT} The card appears inverted."
fi

JSON_PAYLOAD=$(jq -n \
  --arg prompt "$FULL_PROMPT" \
  '{prompt: $prompt, num_images: 1, image_size: "portrait_4_3", output_format: "jpeg"}')

echo "Generating card image..."

RESPONSE=$(curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url // empty')

if [ -z "$IMAGE_URL" ]; then
  echo "Warning: Image generation failed, text-only reading"
fi

# Format the reading
ORIENTATION_DISPLAY=$([ "$ORIENTATION" = "upright" ] && echo "Upright" || echo "Reversed")
MAJOR_TAG=$([ "$IS_MAJOR" = "true" ] && echo " (Major Arcana)" || echo "")

READING="🔮 **${CARD_NAME}** — _${ORIENTATION_DISPLAY}_${MAJOR_TAG}

✨ _${KEYWORDS}_

${MEANING}"

# Add topic-specific insight if available
if [ -n "$TOPIC_MEANING" ] && [ "$TOPIC_MEANING" != "" ]; then
  TOPIC_LABEL=$(echo "$TOPIC" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
  READING="${READING}

💫 **${TOPIC_LABEL} Insight:** ${TOPIC_MEANING}"
fi

echo ""
echo "$READING"

# Send via OpenClaw if channel specified
if [ -n "$CHANNEL" ]; then
  echo ""
  echo "Sending to $CHANNEL..."

  if [ -n "$IMAGE_URL" ]; then
    openclaw message send \
      --action send \
      --channel "$CHANNEL" \
      --message "$READING" \
      --media "$IMAGE_URL"
  else
    openclaw message send \
      --action send \
      --channel "$CHANNEL" \
      --message "$READING"
  fi

  echo "✓ Delivered to $CHANNEL"
fi
