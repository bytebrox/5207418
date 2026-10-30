// Renders the X profile picture in the banner's dot style. Run: node tools/generate-logo.js
"use strict";

const fs = require("fs");
const path = require("path");
const { renderDotsRaw, downscale, encodePng } = require("./dotmatrix");

const SIZE = 1024;
const TAU = Math.PI * 2;

const ARMS = 18;
const TWIST = 2.4;
const CORE = 0.13;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// A vortex: logarithmic spiral lines pulled into a black core
function vortexField(x, y) {
  const nx = (x - SIZE / 2) / (SIZE / 2);
  const ny = (y - SIZE / 2) / (SIZE / 2);
  const r = Math.hypot(nx, ny);
  if (r < 1e-4) return 0;

  const theta = Math.atan2(ny, nx);
  const phi = theta + TWIST * Math.log(r) + Math.sin(r * 18) * 0.06;
  const spacing = TAU / ARMS;
  const perp = r / Math.sqrt(1 + TWIST * TWIST);

  let v = 0;
  for (let k = 0; k < ARMS; k++) {
    let delta = (phi - k * spacing) % TAU;
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;
    const d = (delta * perp) / 0.0075;
    const bundle = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos((k / ARMS) * TAU * 3));
    v += Math.exp(-d * d) * bundle;
  }

  const envelope = smoothstep(CORE, CORE + 0.1, r) * (1 - smoothstep(0.66, 0.94, r)) * (0.8 + 0.5 * (1 - r));
  v *= envelope;

  // bright rim around the event horizon
  const dr = (r - CORE) / 0.011;
  v += Math.exp(-dr * dr) * 0.95;
  const halo = (r - CORE - 0.035) / 0.02;
  v += Math.exp(-halo * halo) * 0.3;

  return r < CORE - 0.02 ? 0 : Math.min(1, v);
}

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public");
fs.mkdirSync(outDir, { recursive: true });
const image = renderDotsRaw({
  width: SIZE,
  height: SIZE,
  pitch: 6,
  field: vortexField,
  sparkle: 0.0015,
  vignette: (x, y) => {
    const d = Math.hypot(x - SIZE / 2, y - SIZE / 2) / (SIZE / 2);
    return Math.max(0, 1 - d * d * 0.55);
  },
});

const outputs = [
  [path.join(outDir, "logo.png"), encodePng(image.width, image.height, image.raw)],
  [path.join(root, "favicon-16.png"), downscale(image, 16, 3.2, 0.62)],
  [path.join(root, "favicon-32.png"), downscale(image, 32, 2.8, 0.66)],
  [path.join(root, "apple-touch-icon.png"), downscale(image, 180, 1.35, 0.85)],
  [path.join(root, "icon-192.png"), downscale(image, 192, 1.35, 0.85)],
  [path.join(root, "icon-512.png"), downscale(image, 512, 1.1, 0.9)],
];
for (const [file, png] of outputs) {
  fs.writeFileSync(file, png);
  console.log(`wrote ${file}`);
}
