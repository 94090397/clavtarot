#!/usr/bin/env node

/**
 * Build script: Inject tarot deck data into index.html
 * Produces a single self-contained HTML file
 */

const fs = require("fs");
const path = require("path");

const deckData = fs.readFileSync(
  path.join(__dirname, "..", "data", "tarot-cards.json"),
  "utf8"
);
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const built = html.replace("DECK_DATA_PLACEHOLDER", deckData);

const outPath = path.join(__dirname, "dist", "index.html");
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(outPath, built);

console.log(`Built: ${outPath} (${(Buffer.byteLength(built) / 1024).toFixed(1)} KB)`);
