"use strict";

const zlib = require("zlib");

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/*
 * Renders a grid of anti-aliased round dots whose size and brightness follow
 * `field(x, y)` (0..1), adds a soft glow, vignette and grain, and returns a PNG.
 */
function renderDots(options) {
  const { width, height, raw } = renderDotsRaw(options);
  return encodePng(width, height, raw);
}

function renderDotsRaw({ width: W, height: H, pitch, field, scale = 1, seed = 5207418, sparkle = 0.004, vignette }) {
  const img = new Float32Array(W * H);
  const glow = new Float32Array(W * H);
  const rand = seeded(seed);

  const cols = Math.ceil(W / pitch) + 1;
  const rows = Math.ceil(H / pitch) + 1;
  const offX = (W - (cols - 1) * pitch) / 2;
  const offY = (H - (rows - 1) * pitch) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = offX + c * pitch;
      const cy = offY + r * pitch;
      const v = field(cx / scale, cy / scale);
      const spark = rand() < sparkle ? 0.5 + rand() * 0.5 : 0;
      const b = Math.max(v, spark);

      const level = 0.07 + 0.93 * b;
      const radius = pitch * (0.16 + 0.26 * b);
      if (b > 0.05) {
        const gi = Math.round(cy) * W + Math.round(cx);
        if (gi >= 0 && gi < glow.length) glow[gi] += b * pitch * pitch * 0.5;
      }

      const x0 = Math.max(0, Math.floor(cx - radius - 1));
      const x1 = Math.min(W - 1, Math.ceil(cx + radius + 1));
      const y0 = Math.max(0, Math.floor(cy - radius - 1));
      const y1 = Math.min(H - 1, Math.ceil(cy + radius + 1));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          const cov = Math.min(1, Math.max(0, radius + 0.5 - d));
          if (cov > 0) img[y * W + x] = Math.max(img[y * W + x], cov * level);
        }
      }
    }
  }

  for (let i = 0; i < 3; i++) blur(glow, W, H, Math.round(1.4 * pitch));

  const vig =
    vignette ||
    ((x, y) => {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      return Math.max(0, 1 - (dx * dx * 0.35 + dy * dy * 0.55));
    });

  const noise = seeded(41);
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const grain = (noise() - 0.5) * 0.02;
      const v = Math.min(1, Math.max(0, (img[y * W + x] + glow[y * W + x] * 0.35) * vig(x, y) + grain));
      const o = y * (W * 3 + 1) + 1 + x * 3;
      raw[o] = Math.round(v * 236);
      raw[o + 1] = Math.round(v * 239);
      raw[o + 2] = Math.round(v * 242);
    }
  }

  return { width: W, height: H, raw };
}

// Area-average downscale of a square filtered RGB scanline buffer.
// `crop` keeps the central fraction of the source; `gain` brightens small icons.
function downscale({ width: W, raw }, size, gain = 1, crop = 1) {
  const stride = W * 3 + 1;
  const out = Buffer.alloc((size * 3 + 1) * size);
  const src = W * crop;
  const off = (W - src) / 2;
  const f = src / size;
  for (let y = 0; y < size; y++) {
    out[y * (size * 3 + 1)] = 0;
    const sy0 = Math.floor(off + y * f);
    const sy1 = Math.max(sy0 + 1, Math.floor(off + (y + 1) * f));
    for (let x = 0; x < size; x++) {
      const sx0 = Math.floor(off + x * f);
      const sx1 = Math.max(sx0 + 1, Math.floor(off + (x + 1) * f));
      const acc = [0, 0, 0];
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const o = sy * stride + 1 + sx * 3;
          acc[0] += raw[o];
          acc[1] += raw[o + 1];
          acc[2] += raw[o + 2];
          n++;
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) out[o + c] = Math.min(255, Math.round((acc[c] / n) * gain));
    }
  }
  return encodePng(size, size, out);
}

function blur(buf, W, H, radius) {
  const tmp = new Float32Array(W * H);
  const n = radius * 2 + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -radius; x < W + radius; x++) {
      if (x + radius < W) acc += buf[y * W + x + radius];
      if (x - radius - 1 >= 0) acc -= buf[y * W + x - radius - 1];
      if (x >= 0 && x < W) tmp[y * W + x] = acc / n;
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -radius; y < H + radius; y++) {
      if (y + radius < H) acc += tmp[(y + radius) * W + x];
      if (y - radius - 1 >= 0) acc -= tmp[(y - radius - 1) * W + x];
      if (y >= 0 && y < H) buf[y * W + x] = acc / n;
    }
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

function encodePng(W, H, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

module.exports = { renderDots, renderDotsRaw, downscale, encodePng };
