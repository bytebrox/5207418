// Renders og.png (1200×630), the link preview image. Run: node tools/generate-og.js
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const W = 1200;
const H = 630;

const FONT = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
};

const img = new Float32Array(W * H);
const glow = new Float32Array(W * H);

function rect(buf, x, y, w, h, v) {
  for (let yy = Math.max(0, y | 0); yy < Math.min(H, (y + h) | 0); yy++)
    for (let xx = Math.max(0, x | 0); xx < Math.min(W, (x + w) | 0); xx++)
      buf[yy * W + xx] = Math.max(buf[yy * W + xx], v);
}

function text(str, cy, sub, pitch, lit, grid) {
  const units = str.length * 6 - 1;
  const ox = Math.round((W - units * sub * pitch) / 2);
  const oy = Math.round(cy - (7 * sub * pitch) / 2);
  const dot = Math.max(1, Math.round(pitch * 0.74));
  [...str].forEach((ch, i) => {
    const rows = FONT[ch];
    for (let r = 0; r < 7 * sub; r++) {
      for (let c = 0; c < 5 * sub; c++) {
        const on = rows[(r / sub) | 0][(c / sub) | 0] === "1";
        const x = ox + (i * 6 * sub + c) * pitch;
        const y = oy + r * pitch;
        rect(img, x, y, dot, dot, on ? lit : grid);
        if (on) rect(glow, x, y, dot, dot, lit);
      }
    }
  });
}

function blur(buf, radius) {
  const tmp = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -radius; x < W + radius; x++) {
      if (x + radius < W) acc += buf[y * W + x + radius];
      if (x - radius - 1 >= 0) acc -= buf[y * W + x - radius - 1];
      if (x >= 0 && x < W) tmp[y * W + x] = acc / (radius * 2 + 1);
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -radius; y < H + radius; y++) {
      if (y + radius < H) acc += tmp[(y + radius) * W + x];
      if (y - radius - 1 >= 0) acc -= tmp[(y - radius - 1) * W + x];
      if (y >= 0 && y < H) buf[y * W + x] = acc / (radius * 2 + 1);
    }
  }
}

text("5207418", 285, 4, 5, 0.95, 0.07);
text("07.11.2026", 475, 2, 3.2, 0.45, 0.04);

for (let i = 0; i < 3; i++) blur(glow, 10);

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  const scan = y % 3 === 0 ? 0.75 : 1;
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2);
    const dy = (y - H / 2) / (H / 2);
    const vignette = Math.max(0, 1 - (dx * dx + dy * dy) * 0.45);
    const noise = (Math.random() - 0.5) * 0.025;
    const v = Math.min(1, Math.max(0, (img[y * W + x] + glow[y * W + x] * 0.9 + noise) * scan * vignette));
    const o = y * (W * 3 + 1) + 1 + x * 3;
    raw[o] = Math.round(v * 236);
    raw[o + 1] = Math.round(v * 239);
    raw[o + 2] = Math.round(v * 242);
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "..", "og.png");
fs.writeFileSync(out, png);
console.log(`wrote ${out}`);
