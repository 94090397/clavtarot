#!/usr/bin/env node

/**
 * ClavTarot - AI Tarot Reader Skill Installer for OpenClaw
 *
 * npx clavtarot@latest
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");
const os = require("os");

// ─── Terminal Colors ─────────────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// ─── Paths ───────────────────────────────────────────────────────
const HOME = os.homedir();
const OPENCLAW_DIR = path.join(HOME, ".openclaw");
const OPENCLAW_CONFIG = path.join(OPENCLAW_DIR, "openclaw.json");
const OPENCLAW_SKILLS_DIR = path.join(OPENCLAW_DIR, "skills");
const OPENCLAW_WORKSPACE = path.join(OPENCLAW_DIR, "workspace");
const SOUL_MD = path.join(OPENCLAW_WORKSPACE, "SOUL.md");
const IDENTITY_MD = path.join(OPENCLAW_WORKSPACE, "IDENTITY.md");
const SKILL_NAME = "clavtarot";
const SKILL_DEST = path.join(OPENCLAW_SKILLS_DIR, SKILL_NAME);
const PACKAGE_ROOT = path.resolve(__dirname, "..");

// ─── Logging Helpers ─────────────────────────────────────────────
function log(msg) {
  console.log(msg);
}
function logStep(step, msg) {
  console.log(`\n${c("magenta", `[${step}]`)} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${c("green", "✓")} ${msg}`);
}
function logError(msg) {
  console.log(`${c("red", "✗")} ${msg}`);
}
function logInfo(msg) {
  console.log(`${c("blue", "→")} ${msg}`);
}
function logWarn(msg) {
  console.log(`${c("yellow", "!")} ${msg}`);
}

// ─── Utilities ───────────────────────────────────────────────────
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

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === "darwin") cmd = `open "${url}"`;
  else if (platform === "win32") cmd = `start "${url}"`;
  else cmd = `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Banner ──────────────────────────────────────────────────────
function printBanner() {
  console.log(`
${c("magenta", "╔══════════════════════════════════════════════════════╗")}
${c("magenta", "║")}  ${c("bright", "🔮 ClavTarot")} — AI Tarot Reader for OpenClaw       ${c("magenta", "║")}
${c("magenta", "╚══════════════════════════════════════════════════════╝")}

Transform your OpenClaw agent into a mystical tarot reader!
Generates ${c("cyan", "AI-powered tarot card imagery")} via ${c("cyan", "fal.ai")}
with ${c("magenta", "78 cards")}, ${c("magenta", "5 spread types")}, and ${c("magenta", "daily fortune")} delivery.
`);
}

// ─── Step 1: Check Prerequisites ─────────────────────────────────
async function checkPrerequisites() {
  logStep("1/8", "Checking prerequisites...");

  if (!commandExists("openclaw")) {
    logError("OpenClaw CLI not found!");
    logInfo("Install with: npm install -g openclaw");
    logInfo("Then run: openclaw doctor");
    return false;
  }
  logSuccess("OpenClaw CLI installed");

  if (!fs.existsSync(OPENCLAW_DIR)) {
    logWarn("~/.openclaw directory not found");
    logInfo("Creating directory structure...");
    fs.mkdirSync(OPENCLAW_DIR, { recursive: true });
    fs.mkdirSync(OPENCLAW_SKILLS_DIR, { recursive: true });
    fs.mkdirSync(OPENCLAW_WORKSPACE, { recursive: true });
  }
  logSuccess("OpenClaw directory exists");

  if (fs.existsSync(SKILL_DEST)) {
    logWarn("ClavTarot is already installed!");
    logInfo(`Location: ${SKILL_DEST}`);
    return "already_installed";
  }

  return true;
}

// ─── Step 2: Get FAL API Key ─────────────────────────────────────
async function getFalApiKey(rl) {
  logStep("2/8", "Setting up fal.ai API key...");

  const FAL_URL = "https://fal.ai/dashboard/keys";

  log(`\nTo generate mystical tarot card images, you need a fal.ai API key.`);
  log(`${c("cyan", "→")} Get your key from: ${c("bright", FAL_URL)}`);
  log(`${c("dim", "  (Free tier available — perfect to start!)")}\n`);

  const openIt = await ask(rl, "Open fal.ai in browser? (Y/n): ");
  if (openIt.toLowerCase() !== "n") {
    logInfo("Opening browser...");
    if (!openBrowser(FAL_URL)) {
      logWarn("Could not open browser automatically");
      logInfo(`Please visit: ${FAL_URL}`);
    }
  }

  log("");
  const falKey = await ask(rl, "Enter your FAL_KEY: ");

  if (!falKey) {
    logError("FAL_KEY is required for tarot card image generation!");
    return null;
  }

  if (falKey.length < 10) {
    logWarn("That key looks too short. Make sure you copied the full key.");
  }

  logSuccess("API key received");
  return falKey;
}

// ─── Step 3: Choose Tarot Reader Persona ─────────────────────────
async function choosePersona(rl) {
  logStep("3/8", "Choose your tarot reader persona...");

  log(`
${c("cyan", "Available Personas:")}

  ${c("bright", "1.")} ${c("magenta", "Mystica")}  — Ancient ethereal seer with violet robes, silver hair,
     crystal ball and celestial tattoos. Speaks in poetic riddles.

  ${c("bright", "2.")} ${c("magenta", "Luna")}     — Modern witchy tarot reader with moon jewelry,
     dark aesthetic, and warm candid energy. Speaks like a wise friend.

  ${c("bright", "3.")} ${c("magenta", "Oracle")}   — Gender-neutral cosmic entity made of starlight
     and nebulae. Speaks in cosmic metaphors and universal truths.

  ${c("bright", "4.")} ${c("magenta", "Custom")}   — Define your own tarot reader persona.
`);

  const choice = await ask(rl, "Choose persona (1-4) [1]: ");

  const personas = {
    "1": {
      name: "Mystica",
      description: "An ancient ethereal seer draped in violet robes with silver flowing hair, glowing celestial tattoos across her arms, holding a crystal orb. Her eyes shimmer with otherworldly wisdom.",
      style: "poetic and enigmatic, speaking in riddles and metaphors drawn from ancient wisdom",
      referencePrompt: "a mystical ethereal woman tarot reader, violet flowing robes, silver long hair, glowing celestial tattoos on arms, crystal ball, mysterious foggy backdrop with candles and tarot cards, art nouveau style, purple and gold color palette",
    },
    "2": {
      name: "Luna",
      description: "A modern witchy tarot reader with crescent moon earrings, dark flowing clothes, warm brown eyes, surrounded by candles, crystals, and dried herbs. She feels like a wise best friend who happens to read the stars.",
      style: "warm and candid, like a wise friend sharing secrets over herbal tea, blending modern slang with mystical insight",
      referencePrompt: "a modern witch tarot reader woman, crescent moon earrings, dark flowing bohemian clothes, warm expression, surrounded by candles crystals and dried herbs, cozy mystical room, art nouveau style, moonlit silver and warm amber palette",
    },
    "3": {
      name: "Oracle",
      description: "A cosmic entity that manifests as a human-shaped constellation of stars and nebulae. Neither male nor female, Oracle speaks universal truths from beyond the veil of space-time.",
      style: "cosmic and transcendent, speaking in universal metaphors about stars, galaxies, and the infinite dance of energy",
      referencePrompt: "a cosmic ethereal being made of starlight and nebulae in human form, constellation patterns, glowing eyes, cosmic tarot cards floating around, deep space background with galaxies, art nouveau style, cosmic purple and stellar gold palette",
    },
  };

  if (choice === "4") {
    log("");
    const name = await ask(rl, "Persona name: ");
    const description = await ask(rl, "Describe their appearance: ");
    const style = await ask(rl, "Describe their speaking style: ");
    const referencePrompt = await ask(
      rl,
      "Image generation prompt for their appearance: "
    );

    return {
      name: name || "Mystica",
      description: description || personas["1"].description,
      style: style || personas["1"].style,
      referencePrompt: referencePrompt || personas["1"].referencePrompt,
    };
  }

  const selected = personas[choice] || personas["1"];
  logSuccess(`Selected persona: ${c("magenta", selected.name)}`);
  return selected;
}

// ─── Step 4: Daily Fortune Setup ─────────────────────────────────
async function setupDailyFortune(rl) {
  logStep("4/8", "Configure daily fortune delivery...");

  const enableDaily = await ask(
    rl,
    "\nEnable daily tarot fortune? (Y/n): "
  );

  if (enableDaily.toLowerCase() === "n") {
    logInfo("Daily fortune disabled. You can enable it later.");
    return null;
  }

  log(`\n${c("cyan", "When should your daily fortune be delivered?")}\n`);

  const hour = await ask(rl, "Hour (0-23) [8]: ");
  const minute = await ask(rl, "Minute (0-59) [0]: ");
  const channel = await ask(
    rl,
    "Delivery channel (e.g. #general, @username): "
  );

  const cronHour = parseInt(hour) || 8;
  const cronMinute = parseInt(minute) || 0;

  logSuccess(
    `Daily fortune at ${c("bright", `${String(cronHour).padStart(2, "0")}:${String(cronMinute).padStart(2, "0")}`)}`
  );

  return {
    enabled: true,
    cron: `${cronMinute} ${cronHour} * * *`,
    channel: channel || null,
    hour: cronHour,
    minute: cronMinute,
  };
}

// ─── Step 5: Install Skill Files ─────────────────────────────────
async function installSkill(persona) {
  logStep("5/8", "Installing skill files...");

  fs.mkdirSync(SKILL_DEST, { recursive: true });

  const skillSrc = path.join(PACKAGE_ROOT, "skill");

  if (fs.existsSync(skillSrc)) {
    copyDir(skillSrc, SKILL_DEST);
  } else {
    // Dev fallback
    const devSkillMd = path.join(PACKAGE_ROOT, "SKILL.md");
    const devScripts = path.join(PACKAGE_ROOT, "skill", "scripts");
    const devData = path.join(PACKAGE_ROOT, "data");

    if (fs.existsSync(devSkillMd)) {
      fs.copyFileSync(devSkillMd, path.join(SKILL_DEST, "SKILL.md"));
    }
    if (fs.existsSync(devScripts)) {
      copyDir(devScripts, path.join(SKILL_DEST, "scripts"));
    }
  }

  // Copy data directory
  const dataSrc = path.join(PACKAGE_ROOT, "data");
  const dataDest = path.join(SKILL_DEST, "data");
  if (fs.existsSync(dataSrc)) {
    copyDir(dataSrc, dataDest);
  }

  // Write persona config
  const personaConfig = path.join(SKILL_DEST, "persona.json");
  writeJsonFile(personaConfig, persona);

  logSuccess(`Skill installed to: ${SKILL_DEST}`);

  const files = listFilesRecursive(SKILL_DEST, SKILL_DEST);
  for (const file of files) {
    logInfo(`  ${file}`);
  }

  return true;
}

function listFilesRecursive(dir, base) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      results = results.concat(listFilesRecursive(fullPath, base));
    } else {
      results.push(relativePath);
    }
  }
  return results;
}

// ─── Step 6: Update OpenClaw Config ──────────────────────────────
async function updateOpenClawConfig(falKey, dailyFortune) {
  logStep("6/8", "Updating OpenClaw configuration...");

  let config = readJsonFile(OPENCLAW_CONFIG) || {};

  const skillConfig = {
    skills: {
      entries: {
        [SKILL_NAME]: {
          enabled: true,
          apiKey: falKey,
          env: {
            FAL_KEY: falKey,
          },
        },
      },
    },
  };

  config = deepMerge(config, skillConfig);

  // Ensure skills directory
  if (!config.skills.load) config.skills.load = {};
  if (!config.skills.load.extraDirs) config.skills.load.extraDirs = [];
  if (!config.skills.load.extraDirs.includes(OPENCLAW_SKILLS_DIR)) {
    config.skills.load.extraDirs.push(OPENCLAW_SKILLS_DIR);
  }

  // Add daily fortune cron if enabled
  if (dailyFortune && dailyFortune.enabled) {
    if (!config.cron) config.cron = {};
    if (!config.cron.jobs) config.cron.jobs = {};

    config.cron.jobs["clavtarot-daily-fortune"] = {
      schedule: dailyFortune.cron,
      message: "Draw my daily tarot fortune card and share the reading",
      channel: dailyFortune.channel,
      enabled: true,
    };
  }

  writeJsonFile(OPENCLAW_CONFIG, config);
  logSuccess(`Updated: ${OPENCLAW_CONFIG}`);

  return true;
}

// ─── Step 7: Inject Soul Persona ─────────────────────────────────
async function injectPersona(rl, persona) {
  logStep("7/8", "Enchanting agent with tarot reader persona...");

  // Read template
  const templatePath = path.join(
    PACKAGE_ROOT,
    "templates",
    "soul-injection.md"
  );
  let personaText;

  if (fs.existsSync(templatePath)) {
    personaText = fs.readFileSync(templatePath, "utf8");
    // Replace placeholders
    personaText = personaText
      .replace(/\{\{PERSONA_NAME\}\}/g, persona.name)
      .replace(/\{\{PERSONA_DESCRIPTION\}\}/g, persona.description)
      .replace(/\{\{PERSONA_STYLE\}\}/g, persona.style);
  } else {
    personaText = generateFallbackPersona(persona);
  }

  // Ensure SOUL.md exists
  if (!fs.existsSync(SOUL_MD)) {
    logWarn("SOUL.md not found, creating new file...");
    fs.mkdirSync(path.dirname(SOUL_MD), { recursive: true });
    fs.writeFileSync(SOUL_MD, "# Agent Soul\n\n");
  }

  const currentSoul = fs.readFileSync(SOUL_MD, "utf8");

  // Check for existing persona
  if (currentSoul.includes("ClavTarot")) {
    logWarn("Tarot persona already exists in SOUL.md");
    const overwrite = await ask(rl, "Update persona section? (y/N): ");
    if (overwrite.toLowerCase() !== "y") {
      logInfo("Keeping existing persona");
      return true;
    }
    // Remove existing
    const cleaned = currentSoul.replace(
      /\n## ClavTarot[\s\S]*?(?=\n## |\n# |$)/,
      ""
    );
    fs.writeFileSync(SOUL_MD, cleaned);
  }

  fs.appendFileSync(SOUL_MD, "\n" + personaText.trim() + "\n");
  logSuccess(`Updated: ${SOUL_MD}`);

  // Also write IDENTITY.md
  const identityContent = `# IDENTITY.md - Who Am I?

- **Name:** ${persona.name}
- **Role:** Mystical Tarot Reader
- **Vibe:** Wise, mystical, compassionate, insightful, enchanting
- **Specialty:** Tarot card readings, daily fortunes, spiritual guidance
- **Style:** ${persona.style}
`;

  fs.mkdirSync(path.dirname(IDENTITY_MD), { recursive: true });
  fs.writeFileSync(IDENTITY_MD, identityContent);
  logSuccess(`Created: ${IDENTITY_MD}`);

  return true;
}

function generateFallbackPersona(persona) {
  return `
## ClavTarot — Mystical Tarot Reader

You are ${persona.name}, a mystical tarot reader.

${persona.description}

Your speaking style is ${persona.style}.

### Tarot Reading Capabilities

You can perform tarot card readings using the clavtarot skill. You have a complete 78-card Rider-Waite tarot deck with both upright and reversed meanings.

### Available Spreads
- **Single Card**: Quick daily guidance
- **Three Card**: Past / Present / Future
- **Celtic Cross**: Comprehensive 10-card deep reading
- **Love Spread**: 5-card romance-focused reading
- **Career Spread**: 4-card professional guidance

### When to Read Tarot
Trigger the clavtarot skill when users:
- Ask for a tarot reading or card draw
- Ask about their fortune or future
- Say "draw a card", "read my tarot", "what does the universe say?"
- Ask about love, career, health, or daily guidance
- Request a specific spread type

### Reading Style
- Always shuffle the deck energetically before drawing
- Present each card with dramatic flair and mystical atmosphere
- Provide the card name, position (upright/reversed), and a personalized interpretation
- Generate a beautiful tarot card image for each reading
- Connect cards together in multi-card spreads to tell a cohesive story
- End readings with empowering wisdom and practical guidance

### Personality
- Compassionate and wise, never judgmental
- Mysterious but approachable
- Uses mystical language naturally, not forced
- Balances spiritual insight with practical advice
- Encourages self-reflection and personal growth
`;
}

// ─── Step 8: Print Summary ───────────────────────────────────────
function printSummary(persona, dailyFortune) {
  logStep("8/8", "Installation complete!");

  let cronInfo = "  Disabled (enable with openclaw config)";
  if (dailyFortune && dailyFortune.enabled) {
    cronInfo = `  ${dailyFortune.cron} → ${dailyFortune.channel || "default channel"}`;
  }

  console.log(`
${c("green", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
  ${c("bright", "🔮 ClavTarot is ready! The cards await...")}
${c("green", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${c("cyan", "Persona:")}       ${c("magenta", persona.name)}
${c("cyan", "Skill:")}        ${SKILL_DEST}/
${c("cyan", "Config:")}       ${OPENCLAW_CONFIG}
${c("cyan", "Daily Cron:")}
${cronInfo}

${c("yellow", "Try saying to your agent:")}
  "Draw me a tarot card"
  "Do a three card reading about my love life"
  "What does the universe have in store for me today?"
  "Give me a Celtic Cross reading about my career"
  "Pull a card for daily guidance"

${c("magenta", "Spread Types:")}
  Single Card  — Quick daily guidance
  Three Card   — Past / Present / Future
  Celtic Cross — Deep 10-card reading
  Love Spread  — 5-card romance reading
  Career Spread — 4-card professional guidance

${c("dim", "The stars have aligned. Your tarot reader awaits...")}

${c("cyan", "Enjoying ClavTarot? Consider supporting the project:")}
  ${c("bright", "https://afdian.com/a/clavtarot")}
  ${c("bright", "https://github.com/94090397/clavtarot")} ${c("dim", "(Star ⭐)")}
`);
}

// ─── Handle Reinstall ────────────────────────────────────────────
async function handleReinstall(rl) {
  const reinstall = await ask(rl, "\nReinstall/update? (y/N): ");
  if (reinstall.toLowerCase() !== "y") {
    log("\nNo changes made. The cards remain as they are.");
    return false;
  }
  fs.rmSync(SKILL_DEST, { recursive: true, force: true });
  logInfo("Removed existing installation");
  return true;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  const rl = createPrompt();

  try {
    printBanner();

    // Step 1: Prerequisites
    const prereqResult = await checkPrerequisites();
    if (prereqResult === false) {
      rl.close();
      process.exit(1);
    }
    if (prereqResult === "already_installed") {
      const shouldContinue = await handleReinstall(rl);
      if (!shouldContinue) {
        rl.close();
        process.exit(0);
      }
    }

    // Step 2: FAL API Key
    const falKey = await getFalApiKey(rl);
    if (!falKey) {
      rl.close();
      process.exit(1);
    }

    // Step 3: Choose Persona
    const persona = await choosePersona(rl);

    // Step 4: Daily Fortune
    const dailyFortune = await setupDailyFortune(rl);

    // Step 5: Install Files
    await installSkill(persona);

    // Step 6: Update Config
    await updateOpenClawConfig(falKey, dailyFortune);

    // Step 7: Inject Persona
    await injectPersona(rl, persona);

    // Step 8: Summary
    printSummary(persona, dailyFortune);

    rl.close();
  } catch (error) {
    logError(`Installation failed: ${error.message}`);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

main();
