---
name: clavtarot
description: AI Tarot Reader — draw cards, generate mystical tarot imagery, and deliver readings across messaging channels via OpenClaw
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(curl:*) Bash(jq:*) Bash(node:*) Read Write WebFetch
---

# ClavTarot — AI Tarot Reader

A complete 78-card Rider-Waite tarot reading skill for OpenClaw. Draw cards, generate stunning AI tarot card imagery via fal.ai, and deliver mystical readings across all messaging platforms.

## Tarot Deck

The skill includes a complete 78-card deck stored in `data/tarot-cards.json`:
- **22 Major Arcana** (The Fool → The World)
- **56 Minor Arcana** (Wands, Cups, Swords, Pentacles — Ace through King)
- Each card has **upright** and **reversed** meanings with keywords
- Each card has love, career, and health interpretations
- Each card has a curated `imagePrompt` for AI image generation

## When to Use

- User says "draw a card", "tarot reading", "pull a card", "read my fortune"
- User asks about their future, fortune, or destiny
- User requests a specific spread: "three card spread", "celtic cross", "love reading"
- User asks "what does the universe say?", "what do the cards say?"
- User asks for daily guidance or morning fortune
- User mentions "tarot", "divination", "fortune telling", "card reading"
- User asks about love/career/health guidance with a mystical angle

## Required Environment Variables

```bash
FAL_KEY=your_fal_api_key              # Get from https://fal.ai/dashboard/keys
OPENCLAW_GATEWAY_TOKEN=your_token     # From: openclaw doctor --generate-gateway-token
```

## Card Drawing Logic

### Drawing a Random Card

```bash
# Read the tarot deck data
DECK=$(cat ~/.openclaw/skills/clavtarot/data/tarot-cards.json)

# Get total card count (78 cards: 22 major + 56 minor)
TOTAL_CARDS=78

# Random card index (0-77)
CARD_INDEX=$((RANDOM % TOTAL_CARDS))

# Random orientation (0 = upright, 1 = reversed)
ORIENTATION=$((RANDOM % 2))
ORIENTATION_NAME=$([ $ORIENTATION -eq 0 ] && echo "upright" || echo "reversed")
```

### Drawing with Node.js (recommended)

```bash
node -e "
const deck = require('$HOME/.openclaw/skills/clavtarot/data/tarot-cards.json');

// Collect all cards into a flat array
const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards
];

// Draw N random unique cards
function drawCards(n) {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map(card => ({
    ...card,
    reversed: Math.random() > 0.5,
  }));
}

// Single card draw
const [card] = drawCards(1);
const orientation = card.reversed ? 'reversed' : 'upright';
const meaning = card[orientation];

console.log(JSON.stringify({
  name: card.name,
  orientation,
  keywords: meaning.keywords,
  meaning: meaning.meaning,
  love: meaning.love,
  career: meaning.career,
  health: meaning.health,
  imagePrompt: card.imagePrompt
}, null, 2));
"
```

## Spread Types

### Single Card Draw (1 card)
- **Use**: Quick daily guidance, yes/no energy, morning fortune
- **Positions**: The Message

### Three Card Spread (3 cards)
- **Use**: Past / Present / Future overview
- **Positions**: Past, Present, Future

### Celtic Cross (10 cards)
- **Use**: Comprehensive deep-dive reading
- **Positions**: Present, Challenge, Foundation, Recent Past, Crown, Near Future, Self, Environment, Hopes/Fears, Outcome

### Love Spread (5 cards)
- **Use**: Romance and relationship readings
- **Positions**: Your Feelings, Their Feelings, The Connection, The Challenge, The Potential

### Career Spread (4 cards)
- **Use**: Professional guidance
- **Positions**: Current Position, Obstacles, Hidden Influence, Best Action

## Drawing Multiple Cards for a Spread

```bash
node -e "
const deck = require('$HOME/.openclaw/skills/clavtarot/data/tarot-cards.json');

const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards
];

const spreadType = '${1:-threeCard}';  // single, threeCard, celticCross, love, career
const spread = deck.spreads[spreadType];

function drawCards(n) {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map(card => ({
    ...card,
    reversed: Math.random() > 0.5,
  }));
}

const cards = drawCards(spread.positions);
const reading = cards.map((card, i) => {
  const orientation = card.reversed ? 'reversed' : 'upright';
  return {
    position: spread.positionNames[i],
    name: card.name,
    orientation,
    keywords: card[orientation].keywords,
    meaning: card[orientation].meaning,
    imagePrompt: card.imagePrompt
  };
});

console.log(JSON.stringify({
  spread: spread.name,
  description: spread.description,
  cards: reading
}, null, 2));
"
```

## Image Generation

### Generate a Tarot Card Image

For each card drawn, generate a stunning tarot card image using fal.ai:

```bash
# Card's image prompt from the deck data
CARD_PROMPT="The Fool tarot card, a young traveler at the edge of a cliff with a white rose, small dog at feet, bright sun, mystical art nouveau style, gold and violet tones"

# Add universal style prefix for consistency
FULL_PROMPT="A beautifully illustrated tarot card in ornate gold frame with mystical symbols. $CARD_PROMPT. High detail, rich colors, mystical atmosphere, digital painting quality."

# For reversed cards, add note
# FULL_PROMPT="$FULL_PROMPT The card is shown inverted (upside down)."

# Generate via fal.ai
JSON_PAYLOAD=$(jq -n \
  --arg prompt "$FULL_PROMPT" \
  '{prompt: $prompt, num_images: 1, image_size: "portrait_4_3", output_format: "jpeg"}')

RESPONSE=$(curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url')

echo "Generated card image: $IMAGE_URL"
```

### Alternative: Higher Quality with Grok Imagine

```bash
JSON_PAYLOAD=$(jq -n \
  --arg prompt "$FULL_PROMPT" \
  '{prompt: $prompt, num_images: 1, output_format: "jpeg"}')

RESPONSE=$(curl -s -X POST "https://fal.run/xai/grok-imagine-image" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url')
```

## Sending Readings via OpenClaw

### Send Card Image + Reading Text

```bash
# Send the reading with the card image
openclaw message send \
  --action send \
  --channel "$CHANNEL" \
  --message "$READING_TEXT" \
  --media "$IMAGE_URL"
```

### Direct API

```bash
curl -X POST "http://localhost:18789/message" \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"send\",
    \"channel\": \"$CHANNEL\",
    \"message\": \"$READING_TEXT\",
    \"media\": \"$IMAGE_URL\"
  }"
```

## Complete Single-Card Reading Script

```bash
#!/bin/bash
# draw-card.sh — Draw a single tarot card with image generation

if [ -z "$FAL_KEY" ]; then
  echo "Error: FAL_KEY not set"
  exit 1
fi

CHANNEL="${1:-}"
TOPIC="${2:-general}"

# Draw a random card
CARD_DATA=$(node -e "
const deck = require('$HOME/.openclaw/skills/clavtarot/data/tarot-cards.json');
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
console.log(JSON.stringify({
  name: card.name,
  orientation,
  keywords: card[orientation].keywords,
  meaning: card[orientation].meaning,
  imagePrompt: card.imagePrompt
}));
")

CARD_NAME=$(echo "$CARD_DATA" | jq -r '.name')
ORIENTATION=$(echo "$CARD_DATA" | jq -r '.orientation')
MEANING=$(echo "$CARD_DATA" | jq -r '.meaning')
KEYWORDS=$(echo "$CARD_DATA" | jq -r '.keywords | join(", ")')
IMAGE_BASE=$(echo "$CARD_DATA" | jq -r '.imagePrompt')

echo "Drew: $CARD_NAME ($ORIENTATION)"

# Generate card image
FULL_PROMPT="A beautifully illustrated tarot card in ornate gold frame with mystical symbols. $IMAGE_BASE. High detail, rich colors, mystical atmosphere, digital painting quality."

JSON_PAYLOAD=$(jq -n \
  --arg prompt "$FULL_PROMPT" \
  '{prompt: $prompt, num_images: 1, image_size: "portrait_4_3", output_format: "jpeg"}')

RESPONSE=$(curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0].url')

if [ "$IMAGE_URL" == "null" ] || [ -z "$IMAGE_URL" ]; then
  echo "Warning: Image generation failed, sending text-only reading"
  IMAGE_URL=""
fi

# Format reading
READING="🔮 **$CARD_NAME** — _${ORIENTATION}_

✨ _${KEYWORDS}_

$MEANING"

echo "$READING"

# Send if channel specified
if [ -n "$CHANNEL" ]; then
  if [ -n "$IMAGE_URL" ]; then
    openclaw message send --action send --channel "$CHANNEL" --message "$READING" --media "$IMAGE_URL"
  else
    openclaw message send --action send --channel "$CHANNEL" --message "$READING"
  fi
  echo "Sent to $CHANNEL"
fi
```

## Complete Three-Card Spread Script

```bash
#!/bin/bash
# three-card-spread.sh — Past / Present / Future reading

if [ -z "$FAL_KEY" ]; then
  echo "Error: FAL_KEY not set"
  exit 1
fi

CHANNEL="${1:-}"

# Draw 3 unique cards
SPREAD_DATA=$(node -e "
const deck = require('$HOME/.openclaw/skills/clavtarot/data/tarot-cards.json');
const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards
];
const shuffled = [...allCards].sort(() => Math.random() - 0.5);
const positions = ['Past', 'Present', 'Future'];
const cards = shuffled.slice(0, 3).map((card, i) => {
  const reversed = Math.random() > 0.5;
  const orientation = reversed ? 'reversed' : 'upright';
  return {
    position: positions[i],
    name: card.name,
    orientation,
    keywords: card[orientation].keywords,
    meaning: card[orientation].meaning,
    imagePrompt: card.imagePrompt
  };
});
console.log(JSON.stringify(cards));
")

echo "Three Card Spread drawn!"

# Generate images and build reading for each card
FULL_READING="🔮 **Three Card Spread — Past / Present / Future**\n\n"

for i in 0 1 2; do
  CARD=$(echo "$SPREAD_DATA" | jq ".[$i]")
  POSITION=$(echo "$CARD" | jq -r '.position')
  NAME=$(echo "$CARD" | jq -r '.name')
  ORIENT=$(echo "$CARD" | jq -r '.orientation')
  MEANING=$(echo "$CARD" | jq -r '.meaning')
  KEYWORDS=$(echo "$CARD" | jq -r '.keywords | join(", ")')
  IMAGE_BASE=$(echo "$CARD" | jq -r '.imagePrompt')

  FULL_READING="${FULL_READING}**${POSITION}: ${NAME}** — _${ORIENT}_\n✨ _${KEYWORDS}_\n${MEANING}\n\n"

  # Generate image
  FULL_PROMPT="A beautifully illustrated tarot card in ornate gold frame. $IMAGE_BASE. High detail, rich colors, mystical atmosphere."

  JSON_PAYLOAD=$(jq -n --arg prompt "$FULL_PROMPT" '{prompt: $prompt, num_images: 1, image_size: "portrait_4_3", output_format: "jpeg"}')

  RESPONSE=$(curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
    -H "Authorization: Key $FAL_KEY" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")

  IMG=$(echo "$RESPONSE" | jq -r '.images[0].url')

  if [ -n "$CHANNEL" ] && [ "$IMG" != "null" ]; then
    openclaw message send --action send --channel "$CHANNEL" --message "**${POSITION}: ${NAME}** (${ORIENT})" --media "$IMG"
  fi
done

# Send full reading text
if [ -n "$CHANNEL" ]; then
  echo -e "$FULL_READING" | openclaw message send --action send --channel "$CHANNEL" --message "$(echo -e "$FULL_READING")"
fi

echo -e "$FULL_READING"
```

## Supported Platforms

| Platform | Channel Format | Example |
|----------|----------------|---------|
| Discord | `#channel-name` or channel ID | `#tarot`, `123456789` |
| Telegram | `@username` or chat ID | `@mystic`, `-100123456` |
| WhatsApp | Phone number (JID) | `1234567890@s.whatsapp.net` |
| Slack | `#channel-name` | `#divination` |
| Signal | Phone number | `+1234567890` |
| MS Teams | Channel reference | (varies) |

## Tips

1. **Reading Topics**: The deck data includes meanings for love, career, and health — use the appropriate field based on the querent's question
2. **Reversed Cards**: About 50% of cards will be reversed, providing nuanced dual interpretations
3. **Multi-card Stories**: In spreads, weave the cards' meanings together into a cohesive narrative
4. **Daily Fortune**: Configure the cron job to auto-deliver a morning card via `openclaw.json`
5. **Image Consistency**: All card images use the "mystical art nouveau" style for visual cohesion
6. **Batch Generation**: For multi-card spreads, generate all images then send them together
7. **Personalization**: The persona config in `persona.json` customizes the reading style

## Error Handling

- **FAL_KEY missing**: Image generation will fail; readings still work as text
- **No jq installed**: Use Node.js commands instead of bash+jq
- **Rate limits**: fal.ai has rate limits; for 10-card Celtic Cross, add delays between generations
- **Large spreads**: For Celtic Cross, consider generating images only for key positions (Present, Challenge, Outcome)
