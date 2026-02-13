#!/bin/bash
# spread.sh — Draw a multi-card tarot spread with AI image generation
#
# Usage: ./spread.sh <spread-type> [channel] [topic]
# Spread types: single, threeCard, celticCross, love, career
# Example: ./spread.sh threeCard "#general"
#          ./spread.sh love "@username"
#          ./spread.sh career "#work"

set -euo pipefail

if [ -z "${FAL_KEY:-}" ]; then
  echo "Error: FAL_KEY environment variable not set"
  echo "Get your key from: https://fal.ai/dashboard/keys"
  exit 1
fi

SPREAD_TYPE="${1:-threeCard}"
CHANNEL="${2:-}"
TOPIC="${3:-general}"
SKILL_DIR="${CLAVTAROT_SKILL_DIR:-$HOME/.openclaw/skills/clavtarot}"

# Validate spread type
VALID_SPREADS=("single" "threeCard" "celticCross" "love" "career")
if [[ ! " ${VALID_SPREADS[*]} " =~ " ${SPREAD_TYPE} " ]]; then
  echo "Error: Invalid spread type '${SPREAD_TYPE}'"
  echo "Valid types: ${VALID_SPREADS[*]}"
  exit 1
fi

# Draw cards for the spread
SPREAD_DATA=$(node -e "
const deck = require('${SKILL_DIR}/data/tarot-cards.json');
const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards
];

const spread = deck.spreads['${SPREAD_TYPE}'];
if (!spread) {
  console.error('Unknown spread type');
  process.exit(1);
}

// Fisher-Yates shuffle for true randomness
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const shuffled = shuffle(allCards);
const drawnCards = shuffled.slice(0, spread.positions).map((card, i) => {
  const reversed = Math.random() > 0.5;
  const orientation = reversed ? 'reversed' : 'upright';
  const data = card[orientation];
  return {
    position: spread.positionNames[i],
    name: card.name,
    numeral: card.numeral || card.rank || '',
    orientation,
    keywords: data.keywords,
    meaning: data.meaning,
    love: data.love || '',
    career: data.career || '',
    health: data.health || '',
    imagePrompt: card.imagePrompt,
    isMajor: card.id <= 21
  };
});

console.log(JSON.stringify({
  spread: {
    name: spread.name,
    description: spread.description,
    totalCards: spread.positions
  },
  cards: drawnCards
}));
")

SPREAD_NAME=$(echo "$SPREAD_DATA" | jq -r '.spread.name')
SPREAD_DESC=$(echo "$SPREAD_DATA" | jq -r '.spread.description')
TOTAL_CARDS=$(echo "$SPREAD_DATA" | jq -r '.spread.totalCards')

echo "🔮 ${SPREAD_NAME} — ${SPREAD_DESC}"
echo "Drawing ${TOTAL_CARDS} cards..."
echo ""

# Build full reading text
FULL_READING="🔮 **${SPREAD_NAME}**
_${SPREAD_DESC}_
"

# Process each card
for i in $(seq 0 $((TOTAL_CARDS - 1))); do
  CARD=$(echo "$SPREAD_DATA" | jq ".cards[$i]")
  POSITION=$(echo "$CARD" | jq -r '.position')
  NAME=$(echo "$CARD" | jq -r '.name')
  ORIENT=$(echo "$CARD" | jq -r '.orientation')
  MEANING=$(echo "$CARD" | jq -r '.meaning')
  KEYWORDS=$(echo "$CARD" | jq -r '.keywords | join(", ")')
  IMAGE_BASE=$(echo "$CARD" | jq -r '.imagePrompt')
  IS_MAJOR=$(echo "$CARD" | jq -r '.isMajor')

  ORIENT_DISPLAY=$([ "$ORIENT" = "upright" ] && echo "Upright" || echo "Reversed")
  MAJOR_TAG=$([ "$IS_MAJOR" = "true" ] && echo " ★" || echo "")

  echo "  [$((i + 1))/${TOTAL_CARDS}] ${POSITION}: ${NAME} (${ORIENT_DISPLAY})${MAJOR_TAG}"

  # Build card reading text
  CARD_READING="
---
**${POSITION}: ${NAME}** — _${ORIENT_DISPLAY}_${MAJOR_TAG}
✨ _${KEYWORDS}_
${MEANING}"

  # Add topic-specific meaning
  if [ "$TOPIC" != "general" ]; then
    TOPIC_MEANING=$(echo "$CARD" | jq -r ".${TOPIC} // empty")
    if [ -n "$TOPIC_MEANING" ]; then
      TOPIC_LABEL=$(echo "$TOPIC" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
      CARD_READING="${CARD_READING}
💫 **${TOPIC_LABEL}:** ${TOPIC_MEANING}"
    fi
  fi

  FULL_READING="${FULL_READING}${CARD_READING}"

  # Generate card image
  FULL_PROMPT="A beautifully illustrated tarot card in ornate gold frame with mystical symbols. ${IMAGE_BASE}. High detail, rich colors, mystical atmosphere, digital painting, art nouveau borders."

  if [ "$ORIENT" = "reversed" ]; then
    FULL_PROMPT="${FULL_PROMPT} The card appears inverted."
  fi

  JSON_PAYLOAD=$(jq -n \
    --arg prompt "$FULL_PROMPT" \
    '{prompt: $prompt, num_images: 1, image_size: "portrait_4_3", output_format: "jpeg"}')

  RESPONSE=$(curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
    -H "Authorization: Key $FAL_KEY" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")

  IMG=$(echo "$RESPONSE" | jq -r '.images[0].url // empty')

  # Send individual card to channel
  if [ -n "$CHANNEL" ] && [ -n "$IMG" ]; then
    openclaw message send \
      --action send \
      --channel "$CHANNEL" \
      --message "**${POSITION}: ${NAME}** (${ORIENT_DISPLAY})${MAJOR_TAG}" \
      --media "$IMG" 2>/dev/null || true
  fi

  # Small delay between image generations to respect rate limits
  if [ "$i" -lt "$((TOTAL_CARDS - 1))" ]; then
    sleep 1
  fi
done

echo ""
echo "$FULL_READING"

# Send full reading summary
if [ -n "$CHANNEL" ]; then
  openclaw message send \
    --action send \
    --channel "$CHANNEL" \
    --message "$FULL_READING" 2>/dev/null || true
  echo ""
  echo "✓ Full reading delivered to $CHANNEL"
fi
