#!/usr/bin/env node

/**
 * ClavTarot 本地测试脚本
 * 不依赖 OpenClaw，直接在终端体验塔罗牌核心功能
 *
 * 用法:
 *   node test-local.js                  → 交互式主菜单
 *   node test-local.js single           → 抽一张牌
 *   node test-local.js three            → 三牌阵 (过去/现在/未来)
 *   node test-local.js love             → 爱情牌阵 (5张)
 *   node test-local.js career           → 事业牌阵 (4张)
 *   node test-local.js celtic           → 凯尔特十字 (10张)
 *   node test-local.js daily            → 每日运势
 *   node test-local.js deck             → 查看完整牌库
 */

const path = require("path");
const readline = require("readline");

// ─── 颜色 ────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgMagenta: "\x1b[45m",
};

const color = (code, text) => `${c[code]}${text}${c.reset}`;

// ─── 加载牌库 ────────────────────────────────────────
const deck = require("./data/tarot-cards.json");

const allCards = [
  ...deck.majorArcana,
  ...deck.minorArcana.wands.cards,
  ...deck.minorArcana.cups.cards,
  ...deck.minorArcana.swords.cards,
  ...deck.minorArcana.pentacles.cards,
];

// ─── 工具函数 ────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawCards(n) {
  const shuffled = shuffle(allCards);
  return shuffled.slice(0, n).map((card) => ({
    ...card,
    isReversed: Math.random() > 0.5,
  }));
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ─── 洗牌动画 ────────────────────────────────────────

async function shuffleAnimation(message, durationMs = 1200) {
  const frames = ["🂠 ", " 🂠", "🂠 ", " 🂠", "🂠 "];
  const shuffleChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const startTime = Date.now();
  let i = 0;

  process.stdout.write("\n");
  while (Date.now() - startTime < durationMs) {
    const frame = shuffleChars[i % shuffleChars.length];
    process.stdout.write(`\r  ${color("magenta", frame)} ${color("dim", message)}`);
    await sleep(80);
    i++;
  }
  process.stdout.write(`\r  ${color("green", "✓")} ${color("dim", message)}\n`);
}

// ─── 翻牌动画 ────────────────────────────────────────

async function revealCard(card, position, delayMs = 600) {
  await sleep(delayMs);

  const orient = card.isReversed ? "reversed" : "upright";
  const orientIcon = card.isReversed ? "↓" : "↑";
  const orientDisplay = card.isReversed ? "Reversed" : "Upright";
  const data = card[orient];
  const isMajor = card.id <= 21;

  // 位置标题
  if (position) {
    console.log(`\n  ${color("cyan", "┌─── " + position + " ───")}`);
  } else {
    console.log(`\n  ${color("cyan", "┌───────────────────")}`);
  }

  // 牌名
  const majorTag = isMajor ? color("yellow", " ★") : "";
  console.log(`  ${color("cyan", "│")}`);
  console.log(`  ${color("cyan", "│")}  ${color("magenta", "🔮 " + card.name)} ${color("dim", "—")} ${color("bright", orientDisplay + " " + orientIcon)}${majorTag}`);

  // 关键词
  console.log(`  ${color("cyan", "│")}  ${color("dim", "✦ " + data.keywords.join(" · "))}`);

  // 解读
  console.log(`  ${color("cyan", "│")}`);

  // 把 meaning 按 60 字符折行
  const words = data.meaning.split(" ");
  let line = "";
  for (const word of words) {
    if ((line + " " + word).length > 62) {
      console.log(`  ${color("cyan", "│")}  ${line.trim()}`);
      line = word;
    } else {
      line += " " + word;
    }
  }
  if (line.trim()) {
    console.log(`  ${color("cyan", "│")}  ${line.trim()}`);
  }

  // 主题解读 (仅大阿卡纳或有额外数据时)
  if (data.love) {
    console.log(`  ${color("cyan", "│")}`);
    console.log(`  ${color("cyan", "│")}  ${color("red", "♥ Love:")} ${data.love}`);
    console.log(`  ${color("cyan", "│")}  ${color("blue", "★ Career:")} ${data.career}`);
    console.log(`  ${color("cyan", "│")}  ${color("green", "♣ Health:")} ${data.health}`);
  }

  console.log(`  ${color("cyan", "│")}`);
  console.log(`  ${color("cyan", "└───────────────────")}`);
}

// ─── 牌阵布局图示 ────────────────────────────────────

function showSpreadLayout(type) {
  const layouts = {
    single: `
      ┌─────┐
      │     │
      │  1  │  ← The Message
      │     │
      └─────┘`,
    threeCard: `
      ┌─────┐  ┌─────┐  ┌─────┐
      │     │  │     │  │     │
      │  1  │  │  2  │  │  3  │
      │     │  │     │  │     │
      └─────┘  └─────┘  └─────┘
       Past     Present   Future`,
    love: `
              ┌─────┐
              │  3  │  The Connection
              └─────┘
      ┌─────┐          ┌─────┐
      │  1  │          │  2  │
      └─────┘          └─────┘
      Your              Their
      Feelings          Feelings
              ┌─────┐
              │  4  │  The Challenge
              └─────┘
              ┌─────┐
              │  5  │  The Potential
              └─────┘`,
    career: `
      ┌─────┐  ┌─────┐
      │  1  │  │  2  │
      └─────┘  └─────┘
      Current   Obstacles
      Position

      ┌─────┐  ┌─────┐
      │  3  │  │  4  │
      └─────┘  └─────┘
      Hidden    Best
      Influence Action`,
    celticCross: `
                 ┌─────┐
                 │  5  │ Crown
                 └─────┘
      ┌─────┐  ┌──┬──┐  ┌─────┐      ┌─────┐
      │  4  │  │ 1│ 2│  │  6  │      │ 10  │ Outcome
      └─────┘  └──┴──┘  └─────┘      ├─────┤
      Past      ↑Cross               │  9  │ Hopes/Fears
                ┌─────┐              ├─────┤
                │  3  │ Foundation   │  8  │ Environment
                └─────┘              ├─────┤
                                     │  7  │ Self
                                     └─────┘`,
  };
  console.log(color("dim", layouts[type] || ""));
}

// ═══════════════════════════════════════════════════════
// 牌阵功能
// ═══════════════════════════════════════════════════════

async function singleCard() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "🔮 Single Card Draw")}                             ${color("magenta", "║")}
${color("magenta", "║")}  ${color("dim", "One card. One message. Listen carefully.")}       ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}`);

  showSpreadLayout("single");
  await shuffleAnimation("Shuffling the 78-card deck...");
  await shuffleAnimation("The cards whisper... one rises to the surface...", 800);

  const [card] = drawCards(1);
  await revealCard(card);

  console.log(`\n  ${color("magenta", "✧ The universe has spoken. Reflect on this message. ✧")}\n`);
}

async function threeCardSpread() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "🔮 Three Card Spread")}                            ${color("magenta", "║")}
${color("magenta", "║")}  ${color("dim", "Past · Present · Future")}                         ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}`);

  showSpreadLayout("threeCard");
  await shuffleAnimation("Shuffling with intention...");
  await shuffleAnimation("Three cards rise from the deck...", 800);

  const cards = drawCards(3);
  const positions = ["① Past — What brought you here", "② Present — Where you stand now", "③ Future — What awaits ahead"];

  for (let i = 0; i < cards.length; i++) {
    await revealCard(cards[i], positions[i], 800);
  }

  console.log(`
  ${color("cyan", "━━━ The Thread of Time ━━━")}

  ${color("magenta", "Your past informs your present,")}
  ${color("magenta", "and your present shapes the future you're creating.")}
  ${color("magenta", "The cards reveal the pattern — the choice remains yours.")}
`);
}

async function loveSpread() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "💕 Love Spread")}                                  ${color("magenta", "║")}
${color("magenta", "║")}  ${color("dim", "Five cards for matters of the heart")}              ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}`);

  showSpreadLayout("love");
  await shuffleAnimation("Infusing the deck with heart energy...");
  await shuffleAnimation("Five cards glow with warmth...", 800);

  const cards = drawCards(5);
  const positions = [
    "① Your Feelings — What your heart holds",
    "② Their Feelings — What their heart holds",
    "③ The Connection — The energy between you",
    "④ The Challenge — What tests your bond",
    "⑤ The Potential — Where love could lead",
  ];

  for (let i = 0; i < cards.length; i++) {
    await revealCard(cards[i], positions[i], 800);
  }

  console.log(`\n  ${color("red", "♥ Love is both the question and the answer. ♥")}\n`);
}

async function careerSpread() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "💼 Career Spread")}                                ${color("magenta", "║")}
${color("magenta", "║")}  ${color("dim", "Four cards for your professional path")}            ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}`);

  showSpreadLayout("career");
  await shuffleAnimation("Channeling career ambitions into the cards...");

  const cards = drawCards(4);
  const positions = [
    "① Current Position — Where you stand",
    "② Obstacles — What blocks your path",
    "③ Hidden Influence — The unseen factor",
    "④ Best Action — Your wisest next move",
  ];

  for (let i = 0; i < cards.length; i++) {
    await revealCard(cards[i], positions[i], 800);
  }

  console.log(`\n  ${color("blue", "★ Fortune favors the bold — but wisdom guides the way. ★")}\n`);
}

async function celticCross() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "🔮 Celtic Cross — The Grand Reading")}             ${color("magenta", "║")}
${color("magenta", "║")}  ${color("dim", "10 cards for comprehensive life guidance")}         ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}`);

  showSpreadLayout("celticCross");
  await shuffleAnimation("This is the most powerful spread in tarot...");
  await shuffleAnimation("Ten cards emerge to reveal the full picture...", 1000);

  const cards = drawCards(10);
  const positions = [
    "① Present Situation — The heart of the matter",
    "② The Challenge — What crosses you",
    "③ Foundation — The root cause",
    "④ Recent Past — What's fading away",
    "⑤ Crown — The best possible outcome",
    "⑥ Near Future — What approaches",
    "⑦ Your Attitude — How you see yourself",
    "⑧ External Influences — How others affect you",
    "⑨ Hopes & Fears — Your deepest desires and anxieties",
    "⑩ Final Outcome — The destiny that forms",
  ];

  for (let i = 0; i < cards.length; i++) {
    await revealCard(cards[i], positions[i], 600);
  }

  console.log(`
  ${color("cyan", "━━━ The Grand Pattern ━━━")}

  ${color("magenta", "Ten cards, ten facets of your journey.")}
  ${color("magenta", "The Celtic Cross reveals not just what will happen,")}
  ${color("magenta", "but WHY — and what you can do about it.")}
  ${color("magenta", "Remember: the cards show possibilities, not certainties.")}
  ${color("magenta", "Your free will is the ultimate trump card.")}
`);
}

async function dailyFortune() {
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rng = seededRandom(dateSeed);
  const cardIndex = Math.floor(rng() * allCards.length);
  const card = { ...allCards[cardIndex] };
  card.isReversed = rng() > 0.5;

  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "🌅 Daily Tarot Fortune")}                          ${color("magenta", "║")}
${color("magenta", "║")}  ${color("dim", dateStr.padEnd(46))}${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}`);

  await shuffleAnimation("The stars align for today's guidance...");
  await revealCard(card, "Card of the Day");

  const elementIcons = { Fire: "🔥", Water: "💧", Air: "💨", Earth: "🌍" };
  const element = card.element || "";
  const eIcon = elementIcons[element] || "✨";

  if (element) {
    console.log(`  ${color("dim", `${eIcon} Element: ${element}`)}`);
  }

  console.log(`
  ${color("magenta", "✧ Carry this card's wisdom with you today. ✧")}
  ${color("magenta", "✧ The future is yours to shape. ✧")}
  ${color("dim", "  (Same card all day — seeded by today's date)")}
`);
}

function showDeck() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "📚 Complete Tarot Deck — 78 Cards")}               ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════╝")}
`);

  console.log(color("yellow", "  ═══ MAJOR ARCANA (22 cards) — The Soul's Journey ═══\n"));
  deck.majorArcana.forEach((card) => {
    const pad = card.numeral.padEnd(4);
    console.log(`    ${color("bright", pad)} ${color("magenta", card.name)}`);
    console.log(`         ${color("green", "↑")} ${card.upright.keywords.join(", ")}`);
    console.log(`         ${color("red", "↓")} ${card.reversed.keywords.join(", ")}\n`);
  });

  const suits = ["wands", "cups", "swords", "pentacles"];
  const suitEmoji = { wands: "🔥", cups: "💧", swords: "💨", pentacles: "🌍" };
  const suitName = {
    wands: "WANDS — Fire — Passion & Creativity",
    cups: "CUPS — Water — Emotions & Relationships",
    swords: "SWORDS — Air — Intellect & Conflict",
    pentacles: "PENTACLES — Earth — Material & Career",
  };

  suits.forEach((suit) => {
    console.log(color("yellow", `\n  ═══ ${suitEmoji[suit]} ${suitName[suit]} (14 cards) ═══\n`));
    deck.minorArcana[suit].cards.forEach((card) => {
      const pad = (card.rank || "").padEnd(6);
      console.log(`    ${color("bright", pad)} ${color("cyan", card.name)}`);
      console.log(`           ${color("green", "↑")} ${card.upright.keywords.join(", ")}`);
      console.log(`           ${color("red", "↓")} ${card.reversed.keywords.join(", ")}\n`);
    });
  });

  console.log(color("bright", `  Total: ${allCards.length} cards (${deck.majorArcana.length} Major + ${allCards.length - deck.majorArcana.length} Minor)\n`));
}

// ═══════════════════════════════════════════════════════
// 交互式主菜单
// ═══════════════════════════════════════════════════════

async function mainMenu() {
  const rl = createPrompt();

  while (true) {
    console.log(`
${color("magenta", "╔══════════════════════════════════════════════════════════╗")}
${color("magenta", "║")}                                                          ${color("magenta", "║")}
${color("magenta", "║")}        ${color("bright", "🔮  C L A V T A R O T  🔮")}                       ${color("magenta", "║")}
${color("magenta", "║")}        ${color("dim", "AI Tarot Reader for OpenClaw")}                     ${color("magenta", "║")}
${color("magenta", "║")}                                                          ${color("magenta", "║")}
${color("magenta", "╠══════════════════════════════════════════════════════════╣")}
${color("magenta", "║")}                                                          ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "1.")} 🔮  Single Card Draw    ${color("dim", "— Quick daily guidance")}     ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "2.")} 🃏  Three Card Spread   ${color("dim", "— Past/Present/Future")}    ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "3.")} 💕  Love Spread         ${color("dim", "— Matters of the heart")}   ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "4.")} 💼  Career Spread       ${color("dim", "— Professional path")}      ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "5.")} ✨  Celtic Cross        ${color("dim", "— The Grand Reading")}      ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "6.")} 🌅  Daily Fortune       ${color("dim", "— Today's card")}           ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "7.")} 📚  View Full Deck      ${color("dim", "— Browse 78 cards")}        ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "8.")} ❓  How to Play         ${color("dim", "— Learn about tarot")}      ${color("magenta", "║")}
${color("magenta", "║")}   ${color("bright", "0.")} 👋  Exit                                          ${color("magenta", "║")}
${color("magenta", "║")}                                                          ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════════════╝")}
`);

    const choice = await ask(rl, `  ${color("cyan", "Choose your path (0-8):")} `);

    switch (choice) {
      case "1":
        await singleCard();
        break;
      case "2":
        await threeCardSpread();
        break;
      case "3":
        await loveSpread();
        break;
      case "4":
        await careerSpread();
        break;
      case "5":
        await celticCross();
        break;
      case "6":
        await dailyFortune();
        break;
      case "7":
        showDeck();
        break;
      case "8":
        showHowToPlay();
        break;
      case "0":
      case "q":
      case "quit":
      case "exit":
        console.log(`\n  ${color("magenta", "✧ The cards will be here when you return. Farewell, seeker. ✧")}\n`);
        rl.close();
        return;
      default:
        console.log(`\n  ${color("yellow", "The spirits don't recognize that symbol. Try 1-8 or 0 to exit.")}`);
    }

    await ask(rl, `\n  ${color("dim", "Press Enter to return to the menu...")}`);
  }
}

// ─── 游戏说明 ────────────────────────────────────────

function showHowToPlay() {
  console.log(`
${color("magenta", "╔══════════════════════════════════════════════════════════╗")}
${color("magenta", "║")}  ${color("bright", "❓  HOW TO PLAY — ClavTarot Guide")}                      ${color("magenta", "║")}
${color("magenta", "╚══════════════════════════════════════════════════════════╝")}

${color("cyan", "  ═══ What is Tarot? ═══")}

  Tarot is an ancient system of 78 cards used for self-reflection,
  guidance, and exploring life's questions. It's not about predicting
  a fixed future — it's about illuminating possibilities and helping
  you make wiser choices.

${color("cyan", "  ═══ The Deck (78 Cards) ═══")}

  ${color("yellow", "★ Major Arcana (22 cards)")}
    The soul's journey from The Fool to The World.
    These are life's BIG themes — transformation, love,
    destiny, awakening. When a Major Arcana card appears,
    pay extra attention — it carries powerful energy.

  ${color("green", "🔥 Wands (14 cards)")}  — Fire — Passion, creativity, ambition
  ${color("blue", "💧 Cups (14 cards)")}   — Water — Emotions, love, relationships
  ${color("white", "💨 Swords (14 cards)")} — Air — Thoughts, intellect, challenges
  ${color("yellow", "🌍 Pentacles (14)")}   — Earth — Money, career, material world

${color("cyan", "  ═══ Upright ↑ vs Reversed ↓ ═══")}

  Each card can appear in two orientations:

  ${color("green", "↑ Upright")}   — The card's energy flows freely.
                Represents the card's core meaning at full strength.

  ${color("red", "↓ Reversed")} — The energy is blocked, internalized, or
                in its shadow form. Not "bad" — just more nuanced.
                Often points to inner work that needs attention.

${color("cyan", "  ═══ The 5 Spreads ═══")}

  ${color("bright", "1. Single Card")} (1 card)
     Best for: Daily guidance, quick yes/no energy check.
     Just ask your question and draw. Simple and powerful.

  ${color("bright", "2. Three Card Spread")} (3 cards)
     Positions: ${color("dim", "Past → Present → Future")}
     Best for: Understanding how a situation evolved and
     where it's heading. The most popular beginner spread.

  ${color("bright", "3. Love Spread")} (5 cards)
     Positions: ${color("dim", "Your Feelings / Their Feelings /")}
                ${color("dim", "The Connection / The Challenge / The Potential")}
     Best for: Romantic questions, understanding relationships,
     exploring emotional dynamics between two people.

  ${color("bright", "4. Career Spread")} (4 cards)
     Positions: ${color("dim", "Current Position / Obstacles /")}
                ${color("dim", "Hidden Influence / Best Action")}
     Best for: Job decisions, career changes, workplace dynamics,
     finding your professional path forward.

  ${color("bright", "5. Celtic Cross")} (10 cards)
     The GRAND reading — the most comprehensive spread in tarot.
     Covers: your situation, challenges, foundation, past, best
     outcome, near future, your attitude, external influences,
     hopes & fears, and final outcome. Use when you need the
     full picture on a major life question.

${color("cyan", "  ═══ How to Get the Best Reading ═══")}

  ${color("magenta", "1.")} Take a deep breath. Clear your mind.
  ${color("magenta", "2.")} Focus on a specific question or area of life.
  ${color("magenta", "3.")} Choose the spread that matches your question.
  ${color("magenta", "4.")} Read each card's message thoughtfully.
  ${color("magenta", "5.")} In multi-card spreads, look for the STORY
     that connects all the cards together.
  ${color("magenta", "6.")} Trust your intuition — if a card's meaning
     sparks a personal insight, that's your answer.

${color("cyan", "  ═══ Daily Fortune ═══")}

  The Daily Fortune uses today's date as a seed, so you get
  the ${color("bright", "same card all day")} — it's YOUR card for today.
  Check it each morning for guidance on the day ahead.

${color("cyan", "  ═══ Remember ═══")}

  ${color("magenta", "✧")} Tarot is a mirror, not a crystal ball.
  ${color("magenta", "✧")} There are no "bad" cards — only lessons.
  ${color("magenta", "✧")} Reversed cards aren't negative — they're nuanced.
  ${color("magenta", "✧")} YOU have free will. The cards show the path;
    you choose whether to walk it.
  ${color("magenta", "✧")} The best readings come when you approach
    with an open mind and an honest heart.
`);
}

// ═══════════════════════════════════════════════════════
// 入口
// ═══════════════════════════════════════════════════════

const command = process.argv[2] || "";

switch (command) {
  case "single":
    singleCard();
    break;
  case "three":
    threeCardSpread();
    break;
  case "love":
    loveSpread();
    break;
  case "career":
    careerSpread();
    break;
  case "celtic":
    celticCross();
    break;
  case "daily":
    dailyFortune();
    break;
  case "deck":
    showDeck();
    break;
  case "how":
  case "guide":
  case "help":
  case "--help":
  case "-h":
    showHowToPlay();
    break;
  default:
    // 无参数 → 启动交互式主菜单
    mainMenu();
    break;
}
