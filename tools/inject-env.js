"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

const fileEnv = loadEnvFile(envPath);
const address =
  process.env.CONTRACT_ADDRESS ||
  fileEnv.CONTRACT_ADDRESS ||
  "00000000000000000000000000000000";

const out = `window.__ENV__ = Object.freeze({\n  CONTRACT_ADDRESS: ${JSON.stringify(address)}\n});\n`;
fs.writeFileSync(path.join(root, "env.js"), out);
console.log(`wrote env.js (${address})`);
