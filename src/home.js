import './common.js';
import './home.css';

// Halftone dot field drawn on a canvas. Dots stay dim and small; near the mouse they
// grow, glow and take on bright rainbow colors, then ease back. Only redraws while
// something is changing.

const SPACING = 22; // px between dot centers
const HOVER_RADIUS = 105; // px around the cursor that reacts
const EASE = 0.14; // how fast dots follow the cursor (0–1)

const canvas = document.getElementById('dots');
const ctx = canvas.getContext('2d');
const css = getComputedStyle(document.documentElement);
const BASE = parseRgb(css.getPropertyValue('--dot'));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let dots = []; // { x, y, r, heat }
let mouse = null;
let frame = 0;

function parseRgb(value) {
  const v = value.trim();
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  return v.match(/\d+/g).slice(0, 3).map(Number);
}

// Smooth wavy bands, similar to the halftone background image.
function size(x, y) {
  const w = window.innerWidth;
  const u = x / w;
  const v = y / window.innerHeight;
  const band = Math.sin(u * 7 + Math.sin(v * 3.2) * 2.4) * Math.cos(v * 4.5 - u * 2.1);
  const t = (band + 1) / 2; // 0..1
  return 0.5 + 2.4 * t * t;
}

// Bright, saturated color that shifts across the screen (cyan → violet → pink → amber).
function hot(d) {
  if (!d.hot) {
    const hue = (190 + ((d.x + d.y * 0.6) / window.innerWidth) * 200) % 360;
    d.hot = hsl(hue, 1, 0.62);
  }
  return d.hot;
}

function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

function layout() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dots = [];
  for (let y = SPACING / 2; y < window.innerHeight + SPACING; y += SPACING) {
    // Offset every other row for a halftone look.
    const offset = Math.round(y / SPACING) % 2 ? SPACING / 2 : 0;
    for (let x = offset; x < window.innerWidth + SPACING; x += SPACING) {
      dots.push({ x, y, r: size(x, y), heat: 0 });
    }
  }
  draw();
}

function draw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  let active = false;
  for (const d of dots) {
    let target = 0;
    if (mouse && !reduceMotion) {
      const dist = Math.hypot(d.x - mouse.x, d.y - mouse.y);
      if (dist < HOVER_RADIUS) target = (1 - dist / HOVER_RADIUS) ** 2;
    }
    d.heat += (target - d.heat) * EASE;
    if (Math.abs(target - d.heat) > 0.002) active = true;

    const h = d.heat;
    const r = d.r * (1 + 2.4 * h) + 3 * h;
    const c = BASE.map((b, i) => Math.round(b + (hot(d)[i] - b) * h));
    ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.7 + 0.3 * h})`;
    // Glow only on hovered dots so the idle field stays cheap to draw.
    ctx.shadowBlur = h > 0.05 ? 14 * h : 0;
    ctx.shadowColor = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  frame = active ? requestAnimationFrame(draw) : 0;
}

function wake() {
  if (!frame) frame = requestAnimationFrame(draw);
}

window.addEventListener('pointermove', (e) => {
  mouse = { x: e.clientX, y: e.clientY };
  wake();
});
document.addEventListener('pointerleave', () => {
  mouse = null;
  wake();
});
window.addEventListener('resize', layout);
layout();
