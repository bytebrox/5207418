// Renders the X header banner. Run: node tools/generate-banner.js
"use strict";

const fs = require("fs");
const path = require("path");
const { renderDots } = require("./dotmatrix");

const BASE_W = 1500;
const BASE_H = 500;
const TAU = Math.PI * 2;

// Two ribbons of nearly parallel sine curves, in base (1500×500) coordinates
function waveField(x, y) {
  const u = x / BASE_W;
  let v = 0;

  for (let k = 0; k < 16; k++) {
    const yk =
      BASE_H * 0.5 +
      Math.sin(u * TAU * 1.15 + 0.6 + k * 0.11) * (95 + k * 2.2) +
      Math.sin(u * TAU * 2.7 + 2.1 - k * 0.07) * 26 -
      (k - 8) * 7;
    const d = (y - yk) / 2.6;
    v += Math.exp(-d * d) * (0.35 + 0.65 * Math.sin((k / 15) * Math.PI));
  }

  for (let k = 0; k < 10; k++) {
    const yk =
      BASE_H * 0.52 +
      Math.sin(u * TAU * 0.8 + 3.4 + k * 0.16) * (120 - k * 3) +
      Math.sin(u * TAU * 3.6 + 0.9 + k * 0.05) * 14 +
      (k - 5) * 9;
    const d = (y - yk) / 2.2;
    v += Math.exp(-d * d) * 0.45 * (0.4 + 0.6 * Math.sin((k / 9) * Math.PI));
  }

  // fade toward the left/right edges
  const edge = Math.min(1, Math.min(u, 1 - u) / 0.16);
  return Math.min(1, v) * (0.15 + 0.85 * edge * edge * (3 - 2 * edge));
}

const outDir = path.join(__dirname, "..", "public");
fs.mkdirSync(outDir, { recursive: true });
for (const [scale, name] of [[1, "banner.png"], [2, "banner@2x.png"]]) {
  const png = renderDots({
    width: BASE_W * scale,
    height: BASE_H * scale,
    pitch: 5 * scale,
    scale,
    field: waveField,
  });
  const file = path.join(outDir, name);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file}`);
}
