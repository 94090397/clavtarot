#!/bin/bash
# daily-fortune.sh — Generate and send a daily tarot fortune
#
# Designed to be triggered by OpenClaw's cron system.
# Usage: ./daily-fortune.sh [channel]
# Example: ./daily-fortune.sh "#general"
#          ./daily-fortune.sh "@username"

set -euo pipefail

if [ -z "${FAL_KEY:-}" ]; then
  echo "Error: FAL_KEY environment variable not set"
  exit 1
fi

CHANNEL="${1:-}"
SKILL_DIR="${CLAVTAROT_SKILL_DIR:-$HOME/.openclaw/skills/clavtarot}"
TODAY=$(date +"%A, %B %d, %Y")

# Draw the Card of the Day
CARD_DATA=$(node -e "
const deck = require('${SKILL_DIR}/data/tarot-cards.json');
const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards
];

// Use date as seed for consistent daily card (same card all day)
const today = new Date();
const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

// Simple seeded random
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rng = seededRandom(dateSeed);
const cardIndex = Math.floor(rng() * allCards.length);
const card = allCards[cardIndex];
const reversed = rng() > 0.5;
const orientation = reversed ? 'reversed' : 'upright';
const data = card[orientation];

console.log(JSON.stringify({
  name: card.name,
  numeral: card.numeral || card.rank || '',
  orientation,
  keywords: data.keywords,
  meaning: data.meaning,
  love: data.love || '',
  career: data.career || '',
  health: data.health || '',
  imagePrompt: card.imagePrompt,
  isMajor: card.id <= 21,
  element: card.element || ''
}));
")

CARD_NAME=$(echo "$CARD_DATA" | jq -r '.name')
ORIENTATION=$(echo "$CARD_DATA" | jq -r '.orientation')
MEANING=$(echo "$CARD_DATA" | jq -r '.meaning')
KEYWORDS=$(echo "$CARD_DATA" | jq -r '.keywords | join(", ")')
LOVE=$(echo "$CARD_DATA" | jq -r '.love')
CAREER=$(echo "$CARD_DATA" | jq -r '.career')
HEALTH=$(echo "$CARD_DATA" | jq -r '.health')
IMAGE_BASE=$(echo "$CARD_DATA" | jq -r '.imagePrompt')
IS_MAJOR=$(echo "$CARD_DATA" | jq -r '.isMajor')
ELEMENT=$(echo "$CARD_DATA" | jq -r '.element')

ORIENT_DISPLAY=$([ "$ORIENTATION" = "upright" ] && echo "Upright" || echo "Reversed")
MAJOR_TAG=$([ "$IS_MAJOR" = "true" ] && echo " (Major Arcana)" || echo "")

# Generate card image
FULL_PROMPT="A beautifully illustrated tarot card in ornate gold frame with celestial decorations. ${IMAGE_BASE}. High detail, rich colors, mystical atmosphere, golden morning light, digital painting quality, art nouveau borders."

JSON_PAYLOAD=$(jq -n \
  --arg prompt "$FULL_PROMPT" \
  '{prompt: $prompt, num_images: 1, image_size: "portrait_4_3", output_format: "jpeg"}')

RESPONSE=$(curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url // empty')

# Compose the daily fortune message
ELEMENT_ICON=""
case "$ELEMENT" in
  Fire) ELEMENT_ICON="🔥" ;;
  Water) ELEMENT_ICON="💧" ;;
  Air) ELEMENT_ICON="💨" ;;
  Earth) ELEMENT_ICON="🌍" ;;
  *) ELEMENT_ICON="✨" ;;
esac

FORTUNE="🌅 **Daily Tarot Fortune — ${TODAY}**

🔮 **Card of the Day: ${CARD_NAME}** — _${ORIENT_DISPLAY}_${MAJOR_TAG}
${ELEMENT_ICON} Element: ${ELEMENT}

✨ _${KEYWORDS}_

**The Message:**
${MEANING}

💕 **Love:** ${LOVE}
💼 **Career:** ${CAREER}
🌿 **Health:** ${HEALTH}

_May the cards light your path today. Remember — the future is yours to shape._"

echo "$FORTUNE"

# Send via OpenClaw
if [ -n "$CHANNEL" ]; then
  if [ -n "$IMAGE_URL" ]; then
    openclaw message send \
      --action send \
      --channel "$CHANNEL" \
      --message "$FORTUNE" \
      --media "$IMAGE_URL"
  else
    openclaw message send \
      --action send \
      --channel "$CHANNEL" \
      --message "$FORTUNE"
  fi

  echo ""
  echo "✓ Daily fortune delivered to $CHANNEL"
fi
