# 🔮 ClavTarot — AI Tarot Reader for OpenClaw

> Transform your OpenClaw agent into a mystical tarot reader with AI-generated card imagery.

[![npm version](https://img.shields.io/npm/v/clavtarot.svg)](https://www.npmjs.com/package/clavtarot)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-purple.svg)](https://github.com/openclaw/openclaw)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-donate-yellow.svg)](https://buymeacoffee.com/clavtarot)

ClavTarot is an [OpenClaw](https://github.com/openclaw/openclaw) skill that gives your AI agent the power of tarot divination. It features a complete **78-card Rider-Waite deck**, **5 spread types**, **AI-generated tarot card images** via fal.ai, and **daily fortune delivery** across all messaging platforms.

---

## Quick Start

```shell
npx clavtarot@latest
```

This will:
- Check OpenClaw is installed
- Guide you to get a fal.ai API key
- Let you choose from 3 tarot reader personas (or create your own)
- Configure daily fortune delivery (optional)
- Install the skill to `~/.openclaw/skills/clavtarot/`
- Configure OpenClaw to use the skill
- Add the tarot reader persona to your agent's SOUL.md

## What It Does

ClavTarot enables your OpenClaw agent to:

- **Draw tarot cards** from a complete 78-card Rider-Waite deck
- **Generate stunning card images** using AI (fal.ai Flux/Grok Imagine)
- **Perform readings** with 5 different spread types
- **Deliver daily fortunes** via cron to any messaging channel
- **Interpret cards** for love, career, and health topics
- **Send readings** across Discord, Telegram, WhatsApp, Slack, and more

### Spreads

| Spread | Cards | Best For |
|--------|-------|----------|
| **Single Card** | 1 | Quick daily guidance |
| **Three Card** | 3 | Past / Present / Future |
| **Celtic Cross** | 10 | Comprehensive deep reading |
| **Love Spread** | 5 | Romance & relationships |
| **Career Spread** | 4 | Professional guidance |

### Personas

| Persona | Vibe |
|---------|------|
| **Mystica** | Ancient ethereal seer with violet robes and celestial tattoos. Speaks in poetic riddles. |
| **Luna** | Modern witchy reader with moon jewelry and warm energy. Speaks like a wise friend. |
| **Oracle** | Cosmic entity of starlight and nebulae. Speaks in universal metaphors. |
| **Custom** | Define your own unique tarot reader persona. |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- [fal.ai](https://fal.ai) account (free tier available)
- [Node.js](https://nodejs.org/) >= 18

## Manual Installation

If you prefer manual setup:

### 1. Get API Key

Visit [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) and create an API key.

### 2. Clone the Skill

```shell
git clone https://github.com/94090397/clavtarot ~/.openclaw/skills/clavtarot
```

### 3. Configure OpenClaw

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clavtarot": {
        "enabled": true,
        "env": {
          "FAL_KEY": "your_fal_key_here"
        }
      }
    }
  }
}
```

### 4. Update SOUL.md

Add the tarot persona to `~/.openclaw/workspace/SOUL.md`:

```markdown
## ClavTarot — Mystical Tarot Reader

You are Mystica, a mystical tarot reader who channels ancient wisdom through the cards.
When users ask for tarot readings, card draws, or fortune guidance, use the clavtarot skill.
```

### 5. Enable Daily Fortune (Optional)

Add to `~/.openclaw/openclaw.json`:

```json
{
  "cron": {
    "jobs": {
      "clavtarot-daily-fortune": {
        "schedule": "0 8 * * *",
        "message": "Draw my daily tarot fortune card and share the reading",
        "enabled": true
      }
    }
  }
}
```

## Usage Examples

Once installed, your agent responds to:

```
"Draw me a tarot card"
"Do a three card reading about my love life"
"What does the universe have in store for me?"
"Give me a Celtic Cross reading about my career"
"Pull a card for daily guidance"
"Read my fortune"
"What do the cards say about my relationship?"
```

### Topic-Specific Readings

Each card has interpretations for:
- **General** — Universal life guidance
- **Love** — Romance and relationships
- **Career** — Professional path and opportunities
- **Health** — Physical and mental wellbeing

## The Deck

### Major Arcana (22 cards)

The soul's journey from The Fool (0) to The World (XXI):

| Card | Keywords (Upright) |
|------|-------------------|
| The Fool | New beginnings, innocence, spontaneity |
| The Magician | Manifestation, resourcefulness, power |
| The High Priestess | Intuition, sacred knowledge, mystery |
| The Empress | Abundance, beauty, nurturing |
| The Emperor | Authority, structure, stability |
| The Hierophant | Tradition, wisdom, mentorship |
| The Lovers | Love, harmony, choices |
| The Chariot | Willpower, determination, victory |
| Strength | Courage, compassion, inner strength |
| The Hermit | Soul-searching, introspection, solitude |
| Wheel of Fortune | Destiny, turning point, luck |
| Justice | Fairness, truth, cause and effect |
| The Hanged Man | Surrender, new perspective, pause |
| Death | Transformation, endings, change |
| Temperance | Balance, moderation, patience |
| The Devil | Shadow self, attachment, liberation |
| The Tower | Upheaval, revelation, awakening |
| The Star | Hope, faith, renewal |
| The Moon | Illusion, intuition, subconscious |
| The Sun | Joy, success, vitality |
| Judgement | Rebirth, inner calling, reflection |
| The World | Completion, wholeness, accomplishment |

### Minor Arcana (56 cards)

Four suits, each with Ace through King:

- **Wands** (Fire) — Passion, creativity, ambition
- **Cups** (Water) — Emotions, relationships, intuition
- **Swords** (Air) — Intellect, communication, conflict
- **Pentacles** (Earth) — Material world, finances, health

## Technical Details

- **Card Data**: 78 cards with upright/reversed meanings in JSON format
- **Image Generation**: fal.ai (Flux Schnell or Grok Imagine)
- **Image Style**: Consistent mystical art nouveau with gold/violet/silver palette
- **Messaging**: OpenClaw Gateway API
- **Daily Cron**: Seeded random for consistent daily card (same card all day)
- **Supported Platforms**: Discord, Telegram, WhatsApp, Slack, Signal, MS Teams

## Project Structure

```
clavtarot/
├── bin/
│   └── cli.js              # npx installer wizard
├── skill/
│   ├── SKILL.md            # OpenClaw skill definition
│   └── scripts/
│       ├── draw-card.sh    # Single card draw script
│       ├── spread.sh       # Multi-card spread script
│       └── daily-fortune.sh # Daily fortune cron script
├── data/
│   └── tarot-cards.json    # Complete 78-card deck data
├── templates/
│   ├── soul-injection.md   # Agent persona template
│   └── cron-daily-fortune.json # Cron job config template
├── .github/
│   └── FUNDING.yml         # GitHub Sponsors config
├── README.md
├── SKILL.md
├── LICENSE
├── CHANGELOG.md
└── package.json
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_KEY` | Yes | fal.ai API key for image generation |
| `OPENCLAW_GATEWAY_TOKEN` | For API calls | OpenClaw Gateway authentication token |
| `CLAVTAROT_SKILL_DIR` | No | Custom skill directory (default: `~/.openclaw/skills/clavtarot`) |

### Persona Configuration

After installation, your persona config is stored at:
```
~/.openclaw/skills/clavtarot/persona.json
```

Edit this file to customize your tarot reader's name, description, and speaking style.

## Contributing

Contributions are welcome! Here are some ideas:

- **New spreads**: Add custom spread layouts
- **More personas**: Create additional tarot reader characters
- **Card art prompts**: Improve the AI image generation prompts
- **Localization**: Add tarot meanings in other languages
- **Audio readings**: Generate spoken tarot readings with TTS

### Development

```shell
git clone https://github.com/94090397/clavtarot.git
cd clavtarot
npm install
```

## Support the Project

If ClavTarot brings a little magic to your day, consider supporting its development:

- **Star the repo**: [Star on GitHub](https://github.com/94090397/clavtarot) — the easiest way to support!
- **爱发电 (Afdian)**: [afdian.com/a/clavtarot](https://afdian.com/a/clavtarot)

## Acknowledgments

- Inspired by [Clawra](https://github.com/SumeLabs/clawra) — the selfie skill for OpenClaw
- Built for [OpenClaw](https://github.com/openclaw/openclaw) — the open-source personal AI assistant
- Tarot imagery powered by [fal.ai](https://fal.ai)
- Card meanings based on the Rider-Waite-Smith tarot tradition

## License

MIT — see [LICENSE](LICENSE) for details.

---

*The cards have been shuffled. Your destiny awaits.* 🔮
