"use strict";

// 7 November 2026, 17:00 CET (UTC+1) = 16:00 UTC / 16:00 GMT
const TARGET = Date.UTC(2026, 10, 7, 16, 0, 0);

const FONT = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "10001", "01010", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "█": ["11111", "11111", "11111", "11111", "11111", "11111", "11111"],
};

const PROJECT = "5207418";
const TITLE = "...";
const AWAY_TITLES = ["don't leave.", PROJECT, "we're still counting.", "come back."];
const FLASH_MESSAGES = [PROJECT, "WAKE UP", "NOT YET", "LOOK CLOSER", "NO SIGNAL", "IT KNOWS", "07.11", "5207418?"];
const IDLE_MESSAGES = ["STILL HERE?", "WE SEE YOU", PROJECT];
const IDLE_AFTER = 20000;
const IDLE_MESSAGE_TIME = 6500;
const TENSION_WINDOW = 10 * 86400000;

const LABELS = ["DAYS", "HOURS", "MINUTES", "SECONDS"];
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>";

// Layout in font units
const DIGIT_W = 5;
const DIGIT_GAP = 1;
const GROUP_GAP = 2;
const COLON_W = 1;

const LIT_LEVELS = 24;
const GRID_LEVELS = 16;

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const bloomA = document.createElement("canvas");
const bloomB = document.createElement("canvas");
const bctxA = bloomA.getContext("2d");
const bctxB = bloomB.getContext("2d");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let W = 0;
let H = 0;
let DPR = 1;
let S = 4;
let pitch = 6;
let dot = 4;
let centerX = 0;
let centerY = 0;
let labelSize = 10;

let slots = [];
let labels = [];
let sparks = [];
let ripples = [];
let dust = [];
let currentParts = null;
let done = false;

const mouse = { x: -1e4, y: -1e4 };
const start = performance.now();
let glitchUntil = 0;
let nextGlitch = start + 4000;
let tension = 0;
let flash = null;

let lastActivity = start;
let idleSince = 0;
let idleAmt = 0;

const cellCache = new Map();
const messageCache = new Map();

/* ---------- helpers ---------- */

function rand(a = 1, b) {
  return b === undefined ? Math.random() * a : a + Math.random() * (b - a);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function makePalette(rgb, levels, max) {
  return Array.from({ length: levels }, (_, i) => `rgba(${rgb},${(((i + 1) / levels) * max).toFixed(3)})`);
}

const palettes = {
  white: makePalette("236,239,242", LIT_LEVELS, 1),
  hot: makePalette("175,232,255", LIT_LEVELS, 1),
  red: makePalette("255,36,36", LIT_LEVELS, 1),
  hotRed: makePalette("255,150,120", LIT_LEVELS, 1),
  grid: makePalette("255,255,255", GRID_LEVELS, 0.5),
};
const litBuckets = Array.from({ length: LIT_LEVELS * 2 }, () => []);
const gridBuckets = Array.from({ length: GRID_LEVELS }, () => []);

/*
 * Each font pixel is subdivided into S×S micro dots. Unlit font pixels that
 * sit in a corner between two lit neighbours get a small triangle filled in,
 * which smooths diagonals and rounds the glyphs.
 */
function cellsFor(ch) {
  const key = ch + S;
  if (cellCache.has(key)) return cellCache.get(key);

  const rows = FONT[ch];
  const mw = rows[0].length;
  const mh = rows.length;
  const cols = mw * S;
  const lit = (c, r) => c >= 0 && r >= 0 && c < mw && r < mh && rows[r][c] === "1";
  const out = new Set();

  for (let r = 0; r < mh; r++) {
    for (let c = 0; c < mw; c++) {
      if (lit(c, r)) {
        for (let sy = 0; sy < S; sy++)
          for (let sx = 0; sx < S; sx++) out.add((r * S + sy) * cols + c * S + sx);
        continue;
      }
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!lit(c + dx, r) || !lit(c, r + dy)) continue;
        for (let sy = 0; sy < S; sy++) {
          for (let sx = 0; sx < S; sx++) {
            const a = dx < 0 ? sx : S - 1 - sx;
            const b = dy < 0 ? sy : S - 1 - sy;
            if (a + b <= S - 2) out.add((r * S + sy) * cols + c * S + sx);
          }
        }
      }
    }
  }

  const result = [...out];
  cellCache.set(key, result);
  return result;
}

function remaining() {
  const diff = Math.max(0, TARGET - Date.now());
  const t = Math.floor(diff / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    diff,
    parts: [pad(Math.floor(t / 86400)), pad(Math.floor((t % 86400) / 3600)), pad(Math.floor((t % 3600) / 60)), pad(t % 60)],
  };
}

/* ---------- layout ---------- */

function buildLayout(parts, mode) {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  bloomA.width = Math.ceil(canvas.width / 4);
  bloomA.height = Math.ceil(canvas.height / 4);
  bloomB.width = Math.ceil(canvas.width / 10);
  bloomB.height = Math.ceil(canvas.height / 10);

  S = W < 560 ? 2 : W < 1100 ? 3 : 4;
  cellCache.clear();
  messageCache.clear();

  const seq = [];
  let units = 0;
  parts.forEach((str, g) => {
    if (g > 0) {
      units += GROUP_GAP;
      seq.push({ type: "colon", u: units, group: g });
      units += COLON_W + GROUP_GAP;
    }
    for (let k = 0; k < str.length; k++) {
      if (k > 0) units += DIGIT_GAP;
      seq.push({ type: "digit", u: units, group: g, k });
      units += DIGIT_W;
    }
  });

  pitch = Math.min((W * 0.86) / (units * S), (H * 0.3) / (7 * S));
  dot = Math.max(0.8, pitch * 0.74);

  const totalW = units * S * pitch;
  const totalH = 7 * S * pitch;
  labelSize = clamp(totalH * 0.085, 7, 13);
  const labelGap = totalH * 0.3;
  const ox = (W - totalW) / 2;
  const oy = (H - (totalH + labelGap + labelSize)) / 2;
  centerX = W / 2;
  centerY = oy + totalH / 2;

  slots = seq.map((s) => ({
    type: s.type,
    group: s.group,
    k: s.k,
    x: ox + s.u * S * pitch,
    y: oy,
    cols: (s.type === "digit" ? DIGIT_W : COLON_W) * S,
    rows: 7 * S,
    char: null,
    particles: [],
  }));

  labels = LABELS.map((text, g) => {
    const groupSlots = slots.filter((s) => s.type === "digit" && s.group === g);
    const first = groupSlots[0];
    const last = groupSlots[groupSlots.length - 1];
    return {
      text,
      x: (first.x + last.x + last.cols * pitch) / 2,
      y: oy + totalH + labelGap,
      reveal: mode === "intro" ? start + 1600 + g * 260 : 0,
    };
  });

  slots.forEach((slot) => setChar(slot, slot.type === "colon" ? ":" : parts[slot.group][slot.k], mode));
  currentParts = parts;
}

/* ---------- particles ---------- */

function cellPos(slot, idx) {
  return [slot.x + ((idx % slot.cols) + 0.5) * pitch, slot.y + (Math.floor(idx / slot.cols) + 0.5) * pitch];
}

function setChar(slot, ch, mode) {
  const targets = cellsFor(ch);
  const targetSet = new Set(targets);
  const claimed = new Set();
  const keep = [];
  const movers = [];

  for (const p of slot.particles) {
    if (targetSet.has(p.idx) && !claimed.has(p.idx)) {
      claimed.add(p.idx);
      keep.push(p);
    } else {
      movers.push(p);
    }
  }

  const open = shuffle(targets.filter((i) => !claimed.has(i)));
  shuffle(movers);

  for (const idx of open) {
    const [tx, ty] = cellPos(slot, idx);
    let p = movers.pop();

    if (p) {
      p.k = rand(0.05, 0.085);
      p.damp = 0.82;
      p.delay = rand(8);
      // perpendicular kick so particles travel along curves
      const swirl = rand(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1);
      p.vx += -(ty - p.y) * swirl;
      p.vy += (tx - p.x) * swirl;
    } else if (mode === "intro") {
      const dist = Math.hypot(tx - centerX, ty - centerY) / W;
      p = particle(rand(W), rand(H));
      p.k = rand(0.012, 0.03);
      p.damp = 0.9;
      p.delay = 25 + dist * 90 + rand(35);
    } else if (mode === "snap") {
      p = particle(tx, ty);
      p.a = 1;
    } else {
      const spread = pitch * S * 4;
      p = particle(tx + rand(-spread, spread), ty + rand(-spread, spread));
      p.k = rand(0.05, 0.08);
      p.damp = 0.82;
      p.delay = rand(10);
    }

    if (mode === "snap") {
      p.x = tx;
      p.y = ty;
      p.vx = p.vy = 0;
    }
    p.idx = idx;
    p.tx = tx;
    p.ty = ty;
    keep.push(p);
  }

  for (const p of movers) {
    sparks.push({
      x: p.x,
      y: p.y,
      vx: rand(-2.5, 2.5) + p.vx,
      vy: rand(-3, 0.5) + p.vy,
      life: 1,
      decay: rand(0.012, 0.03),
    });
  }

  slot.particles = keep;
  slot.char = ch;
}

function particle(x, y) {
  return { x, y, vx: 0, vy: 0, tx: x, ty: y, idx: -1, k: 0.08, damp: 0.8, delay: 0, a: 0, seed: rand(1000) };
}

/* ---------- pixel messages ---------- */

// Messages use the same LED grid as the timer, sized to fit `slots` characters
function messageLayout(slots) {
  if (messageCache.has(slots)) return messageCache.get(slots);

  const units = slots * (DIGIT_W + DIGIT_GAP) - DIGIT_GAP;
  const mp = Math.min(pitch, (W * 0.86) / (units * S));
  const layout = {
    mp,
    dot: Math.max(0.8, mp * 0.74),
    ox: (W - units * S * mp) / 2,
    oy: centerY - (7 * S * mp) / 2,
    step: (DIGIT_W + DIGIT_GAP) * S * mp,
  };
  messageCache.set(slots, layout);
  return layout;
}

function drawMessage(text, count, alpha, split, cursor, reserveCursor = cursor) {
  const layout = messageLayout(text.length + (reserveCursor ? 1 : 0));
  const shown = text.slice(0, count) + (cursor ? "█" : "");
  const { mp, dot: d, ox, oy, step } = layout;
  const h = d / 2;
  const cols = DIGIT_W * S;
  const rgb = done ? "255,36,36" : "236,239,242";

  const pass = (dx, fill) => {
    ctx.fillStyle = fill;
    [...shown].forEach((ch, i) => {
      const x0 = ox + i * step + dx;
      for (const idx of cellsFor(FONT[ch] ? ch : " ")) {
        const jitter = split ? rand(-0.4, 0.4) * d : 0;
        ctx.fillRect(x0 + ((idx % cols) + 0.5) * mp - h + jitter, oy + (Math.floor(idx / cols) + 0.5) * mp - h, d, d);
      }
    });
  };

  if (split) {
    const off = layout.mp * S * 0.7;
    ctx.globalCompositeOperation = "lighter";
    pass(-off, `rgba(255,0,70,${(alpha * 0.6).toFixed(3)})`);
    pass(off, `rgba(0,210,255,${(alpha * 0.6).toFixed(3)})`);
    ctx.globalCompositeOperation = "source-over";
  }
  pass(0, `rgba(${rgb},${alpha.toFixed(3)})`);
}

function initDust() {
  dust = Array.from({ length: 70 }, () => ({
    x: rand(W),
    y: rand(H),
    vx: rand(-0.12, 0.12),
    vy: rand(-0.2, -0.03),
    s: rand(0.6, 1.6),
    a: rand(0.04, 0.22),
    seed: rand(1000),
  }));
}

/* ---------- interaction ---------- */

function activity() {
  const now = performance.now();
  if (idleSince) {
    idleSince = 0;
    triggerGlitch(now, 220, false);
  }
  lastActivity = now;
}

["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach((type) =>
  window.addEventListener(type, activity, { passive: true })
);

window.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("pointerleave", () => {
  mouse.x = mouse.y = -1e4;
});
document.addEventListener("pointerout", (e) => {
  if (!e.relatedTarget) mouse.x = mouse.y = -1e4;
});
window.addEventListener("pointerdown", (e) => {
  const R = pitch * S * 14;
  for (const slot of slots) {
    for (const p of slot.particles) {
      const dx = p.x - e.clientX;
      const dy = p.y - e.clientY;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const f = (1 - d / R) * 14;
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
    }
  }
  ripples.push({ x: e.clientX, y: e.clientY, t: performance.now(), s: 1.4 });
  triggerGlitch(performance.now(), 180, false);
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildLayout(remaining().parts, "snap");
    initDust();
  }, 120);
});

function triggerGlitch(now, duration, allowFlash = true) {
  if (reduceMotion) return;
  glitchUntil = now + duration;
  const label = labels[(Math.random() * labels.length) | 0];
  if (label) label.reveal = now + 120;

  if (allowFlash && !idleSince && !done && Math.random() < 0.3 + tension * 0.5) {
    const text = FLASH_MESSAGES[(Math.random() * FLASH_MESSAGES.length) | 0];
    const from = now + duration * 0.25;
    flash = { text, from, until: from + rand(90, 170) + tension * 120 };
  }
}

/* ---------- tab title ---------- */

let awayTimer = 0;
let backTimer = 0;
document.addEventListener("visibilitychange", () => {
  clearInterval(awayTimer);
  clearTimeout(backTimer);
  if (document.hidden) {
    let i = 0;
    document.title = AWAY_TITLES[0];
    awayTimer = setInterval(() => {
      document.title = AWAY_TITLES[++i % AWAY_TITLES.length];
    }, 2500);
  } else {
    document.title = "you came back.";
    backTimer = setTimeout(() => (document.title = TITLE), 2500);
    lastActivity = performance.now();
    triggerGlitch(performance.now(), 260);
  }
});

/* ---------- console ---------- */

function consoleMessage() {
  const art = Array.from({ length: 7 }, (_, r) =>
    [...PROJECT].map((ch) => FONT[ch][r].replace(/1/g, "█").replace(/0/g, " ")).join("  ")
  ).join("\n");
  const mono = "font-family:monospace;";
  console.log(`%c\n${art}\n`, `${mono}color:#e8e8e8;background:#000;line-height:1.1;padding:6px 12px;`);
  console.log("%cso you are the curious one.", `${mono}color:#9a9a9a;font-size:13px;`);
  console.log("%cthe door is not open yet. 07.11.2026 · 16:00 GMT", `${mono}color:#666;`);
  console.log("%cwatch the glitches. they are not random.", `${mono}color:#444;font-style:italic;`);
  console.log("%cx.com/5207418", `${mono}color:#333;`);
}

/* ---------- simulation ---------- */

function update(dt, now) {
  const R = pitch * S * 3.2;
  const colonOn = Date.now() % 1000 < 500;
  const jitter = reduceMotion ? 0 : Math.max(0, tension - 0.5) * 0.5 * pitch;

  for (const slot of slots) {
    const targetA = slot.type === "colon" ? (colonOn ? 1 : 0.16) : 1;
    for (const p of slot.particles) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }

      p.vx += (p.tx - p.x) * p.k * dt;
      p.vy += (p.ty - p.y) * p.k * dt;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < R * R) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / R) ** 2 * 2.6 * dt;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }

      if (jitter && Math.random() < 0.08) {
        p.vx += rand(-jitter, jitter);
        p.vy += rand(-jitter, jitter);
      }

      const damp = p.damp ** dt;
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += (targetA - p.a) * Math.min(1, 0.12 * dt);

      // once a slow intro particle has arrived it becomes snappy
      if (p.k < 0.05 && Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) < pitch) {
        p.k = 0.08;
        p.damp = 0.8;
      }
    }
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.vx *= 0.96 ** dt;
    s.vy = s.vy * 0.96 ** dt - 0.035 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= s.decay * dt;
    if (s.life <= 0) sparks.splice(i, 1);
  }

  for (const m of dust) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.y < -5) m.y = H + 5;
    if (m.x < -5) m.x = W + 5;
    if (m.x > W + 5) m.x = -5;
  }

  ripples = ripples.filter((r) => now - r.t < 1600);
}

function rippleBoost(x, y, now) {
  let b = 0;
  const width = pitch * S * 2.2;
  for (const r of ripples) {
    const age = now - r.t;
    const radius = age * 1.25;
    const d = Math.hypot(x - r.x, y - r.y) - radius;
    b += Math.exp(-(d * d) / (width * width)) * (1 - age / 1600) * r.s;
  }
  return b;
}

/* ---------- rendering ---------- */

function draw(now) {
  const elapsed = now - start;
  const glitching = now < glitchUntil;
  const g = glitching ? rand(0.4, 1) * (1 + tension) : 0;
  const flashing = flash && now >= flash.from && now < flash.until;
  const visibility = flashing ? 0 : 1 - idleAmt;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // dust
  for (const m of dust) {
    const tw = 0.5 + 0.5 * Math.sin(now * 0.0012 + m.seed);
    ctx.fillStyle = `rgba(255,255,255,${(m.a * tw).toFixed(3)})`;
    ctx.fillRect(m.x, m.y, m.s, m.s);
  }

  // unlit LED grid
  const introR = reduceMotion ? 1e5 : elapsed * 0.9;
  const feather = pitch * S * 6;
  const flashR = pitch * S * 6;
  for (const b of gridBuckets) b.length = 0;

  for (const slot of slots) {
    for (let r = 0; r < slot.rows; r++) {
      const y = slot.y + (r + 0.5) * pitch;
      for (let c = 0; c < slot.cols; c++) {
        const x = slot.x + (c + 0.5) * pitch;
        const dc = Math.hypot(x - centerX, y - centerY);
        const reveal = clamp((introR - dc) / feather, 0, 1);
        if (reveal <= 0) continue;

        let v = 0.055;
        const edge = 1 - Math.abs(introR - dc - feather * 0.5) / feather;
        if (edge > 0 && reveal < 1) v += edge * 0.35;
        v += rippleBoost(x, y, now) * 0.16;
        const md = Math.hypot(x - mouse.x, y - mouse.y);
        if (md < flashR) v += (1 - md / flashR) ** 2 * 0.22;
        if (tension > 0.3) v *= 1 + rand(-0.5, 0.5) * tension;
        v *= reveal;

        const level = Math.min(GRID_LEVELS - 1, Math.floor((v / 0.5) * GRID_LEVELS));
        if (level >= 0) gridBuckets[level].push(x, y);
      }
    }
  }

  const gdot = dot * 0.9;
  const gh = gdot / 2;
  for (let i = 0; i < GRID_LEVELS; i++) {
    const b = gridBuckets[i];
    if (!b.length) continue;
    ctx.fillStyle = palettes.grid[i];
    for (let j = 0; j < b.length; j += 2) ctx.fillRect(b[j] - gh, b[j + 1] - gh, gdot, gdot);
  }

  // lit particles
  for (const b of litBuckets) b.length = 0;
  for (const slot of slots) {
    for (const p of slot.particles) {
      if (p.a < 0.01) continue;
      const speed = Math.abs(p.vx) + Math.abs(p.vy);
      let v = p.a * (0.82 + 0.18 * Math.sin(now * 0.004 + p.seed));
      v += Math.min(0.4, speed * 0.12) + rippleBoost(p.x, p.y, now) * 0.25;
      v *= visibility;
      if (v < 0.02) continue;
      const level = Math.min(LIT_LEVELS - 1, Math.floor(v * LIT_LEVELS));
      const hot = speed > 1.4 ? LIT_LEVELS : 0;
      litBuckets[hot + level].push(p.x, p.y);
    }
  }

  const base = done ? palettes.red : palettes.white;
  const hotPal = done ? palettes.hotRed : palettes.hot;
  const h = dot / 2;

  const drawLit = (dx, dy, override) => {
    for (let i = 0; i < litBuckets.length; i++) {
      const b = litBuckets[i];
      if (!b.length) continue;
      ctx.fillStyle = override || (i < LIT_LEVELS ? base[i] : hotPal[i - LIT_LEVELS]);
      for (let j = 0; j < b.length; j += 2) ctx.fillRect(b[j] - h + dx, b[j + 1] - h + dy, dot, dot);
    }
  };

  if (glitching) {
    const off = g * pitch * S * 0.7;
    ctx.globalCompositeOperation = "lighter";
    drawLit(-off, 0, "rgba(255,0,70,0.55)");
    drawLit(off, 0, "rgba(0,210,255,0.55)");
    ctx.globalCompositeOperation = "source-over";
  }
  drawLit(0, 0);

  if (flashing) drawMessage(flash.text, flash.text.length, rand(0.75, 1), true, false);

  if (idleAmt > 0.01 && idleSince) {
    const t = now - idleSince;
    const n = Math.floor(t / IDLE_MESSAGE_TIME);
    const text = IDLE_MESSAGES[n % IDLE_MESSAGES.length];
    const local = t - n * IDLE_MESSAGE_TIME;
    const typed = Math.min(text.length, Math.floor((local - 600) / 150));
    const cursor = Math.floor(now / 530) % 2 === 0;
    drawMessage(text, Math.max(0, typed), idleAmt, glitching, cursor, true);
  }

  // sparks
  for (const s of sparks) {
    ctx.fillStyle = done ? `rgba(255,70,50,${s.life.toFixed(3)})` : `rgba(220,240,255,${s.life.toFixed(3)})`;
    const sz = dot * (0.35 + s.life * 0.5);
    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }

  drawLabels(now, visibility);

  // bloom: progressive downsample, added back on top
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  bctxA.clearRect(0, 0, bloomA.width, bloomA.height);
  bctxA.drawImage(canvas, 0, 0, bloomA.width, bloomA.height);
  bctxB.clearRect(0, 0, bloomB.width, bloomB.height);
  bctxB.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(bloomA, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.7;
  ctx.drawImage(bloomB, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  if (glitching) {
    const top = (centerY - pitch * S * 6) * DPR;
    const band = pitch * S * 12 * DPR;
    const n = 2 + ((Math.random() * 5) | 0);
    for (let i = 0; i < n; i++) {
      const y = top + rand(band);
      const sh = rand(2, pitch * S * 1.6) * DPR;
      const dx = rand(-1, 1) * g * W * 0.04 * DPR;
      ctx.drawImage(canvas, 0, y, canvas.width, sh, dx, y, canvas.width, sh);
    }
  }
}

function drawLabels(now, visibility) {
  if (visibility < 0.01) return;
  ctx.font = `${labelSize}px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const spacing = labelSize * 0.45;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;

  for (const l of labels) {
    if (now < l.reveal - 400) continue;
    let text = "";
    for (let i = 0; i < l.text.length; i++) {
      text += now > l.reveal + i * 70 ? l.text[i] : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
    }
    const settled = now > l.reveal + l.text.length * 70;
    const flick = (settled ? 0.26 + 0.04 * Math.sin(now * 0.002 + l.x) : rand(0.2, 0.6)) * visibility;
    ctx.fillStyle = done ? `rgba(255,60,60,${flick})` : `rgba(255,255,255,${flick})`;
    ctx.fillText(text, l.x + spacing / 2, l.y);
  }

  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

/* ---------- main loop ---------- */

let last = performance.now();

function frame(now) {
  const dt = Math.min(3, (now - last) / 16.667);
  last = now;

  const { diff, parts } = remaining();
  tension = clamp(1 - diff / TENSION_WINDOW, 0, 1);

  const idle = now - lastActivity > IDLE_AFTER && !done;
  if (idle && !idleSince) {
    idleSince = now;
    triggerGlitch(now, 240, false);
  } else if (!idle) {
    idleSince = 0;
  }
  idleAmt += ((idle ? 1 : 0) - idleAmt) * Math.min(1, (idle ? 0.03 : 0.15) * dt);

  if (parts.some((p, i) => p.length !== currentParts[i].length)) {
    buildLayout(parts, "snap");
  } else {
    for (const slot of slots) {
      if (slot.type !== "digit") continue;
      const ch = parts[slot.group][slot.k];
      if (ch !== slot.char) setChar(slot, ch, "morph");
    }
    if (parts[3] !== currentParts[3] && !reduceMotion) {
      ripples.push({ x: centerX, y: centerY, t: now, s: parts[2] !== currentParts[2] ? 1.6 : 0.8 });
    }
    if (parts[2] !== currentParts[2]) triggerGlitch(now, 260);
    currentParts = parts;
  }

  if (diff === 0 && !done) {
    done = true;
    for (const slot of slots)
      for (const p of slot.particles) {
        p.vx += rand(-12, 12);
        p.vy += rand(-12, 12);
      }
    ripples.push({ x: centerX, y: centerY, t: now, s: 2.5 });
    triggerGlitch(now, 600);
  }

  if (!reduceMotion && now > nextGlitch) {
    triggerGlitch(now, rand(90, 280) * (1 + tension));
    const interval = 11000 - tension * 9500;
    nextGlitch = now + rand(0.35, 1) * interval;
  }

  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}

function initGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  document.getElementById("grain").style.backgroundImage = `url(${c.toDataURL()})`;
}

function initCa() {
  const el = document.getElementById("ca");
  const address = (window.__ENV__ && window.__ENV__.CONTRACT_ADDRESS) || "";
  if (!el || !address) return;

  el.hidden = false;
  el.textContent = address;

  let reset;
  el.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
      el.classList.add("copied");
      el.textContent = "COPIED";
      clearTimeout(reset);
      reset = setTimeout(() => {
        el.classList.remove("copied");
        el.textContent = address;
      }, 1400);
    } catch {
      /* clipboard may be blocked */
    }
  });
}

buildLayout(remaining().parts, reduceMotion ? "snap" : "intro");
initDust();
initGrain();
initCa();
consoleMessage();
requestAnimationFrame(frame);
