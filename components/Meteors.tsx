"use client";

import { useEffect, useRef } from "react";
import { BAYER, oklch } from "../lib/field";
import { moonAt, nearCloud } from "./CloudBand";

// Shooting stars, drawn above everything. Showers of 1-4, well spaced, radiating from the moon, then the sky rests.
// Now and then one lands on a real letter and sets it alight: the letter itself is recoloured through the
// CSS Custom Highlight API (no DOM changes, so React never notices), and pixel flames rise off it here.
const FINE = 4; // css px per overlay pixel: flames are this fine, so they sit in proportion to body text
const CELL = 8; // css px per sky cell: meteors keep the sky's grain and their original size
const SPEED = 640; // css px/s, only used for how long an aimed meteor's tail takes to drain into its letter
const FREE_SPEED = [520, 640], FREE_LIFE = [0.9, 1.3]; // short arcs, like the sketch: ~300-400 px left, curling down
const TAIL = 34; // tail samples, one sky cell apart
const SHOWER = [1, 4], GAP = [1.2, 3.2], REST = 30, FIRST = 4.5, AIM = 0.35; // count, s apart, s rest, s to first, P(a shower has a hit)
const FLASH = 0.15, BURN = 1.8, COOL = 1; // s: white-hot impact, burning, cooling back to normal

const rgb32 = (c: number[]) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
// Head to tail: white, pale gold, then cooling into the sky's own blues (CloudBand PAL 5 and 4), so the tail dissolves into the sky.
const MET = [oklch(0.99, 0.02, 95), oklch(0.93, 0.09, 92), oklch(0.8, 0.1, 85), oklch(0.5, 0.085, 245)].map(rgb32);
const GLOW = rgb32(oklch(0.4, 0.085, 252)); // the head lights the sky around it, in the sky's lighter tone
// Fire: white-gold, gold, amber, orange, ember red, ash.
const FIRE = [oklch(0.98, 0.04, 95), oklch(0.9, 0.14, 92), oklch(0.8, 0.16, 72), oklch(0.68, 0.18, 48), oklch(0.55, 0.17, 35), oklch(0.38, 0.06, 30)].map(rgb32);
// A hit letter: white-hot flash, flickers gold/orange while burning, cools through ember red, then back to its own colour.
// Injected at runtime because the CSS build's parser doesn't know ::highlight() yet and warns on every build.
const BURN_CSS = `
::highlight(burn-0) { color: oklch(0.99 0.03 95); text-shadow: 0 0 0.35em oklch(0.9 0.14 92 / 0.9); }
::highlight(burn-1) { color: oklch(0.9 0.15 90); text-shadow: 0 -0.05em 0.3em oklch(0.8 0.16 72 / 0.85); }
::highlight(burn-2) { color: oklch(0.76 0.18 55); text-shadow: 0 -0.05em 0.35em oklch(0.68 0.18 48 / 0.85); }
::highlight(burn-3) { color: oklch(0.6 0.17 38); text-shadow: 0 0 0.2em oklch(0.55 0.17 35 / 0.6); }
::highlight(burn-4) { color: oklch(0.72 0.08 50); }`;

type Meteor = { x: number; y: number; vx: number; vy: number; g: number; t0: number; life: number; range: Range | null; hit?: boolean };
type Burn = { range: Range; t0: number; big: boolean; flick: number; next: number };
type Spark = { x: number; y: number; vx: number; vy: number; g: number; t0: number; life: number; c0: number; size: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** A random visible letter (sometimes two) inside the sheet, as a Range, or null. */
function pickLetter(): Range | null {
  const root = document.querySelector(".sheet") ?? document.body;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walk.nextNode()) {
    const n = walk.currentNode as Text;
    if (/\S/.test(n.data) && !n.parentElement?.closest(".sr-only")) nodes.push(n);
  }
  for (let tries = 0; tries < 40 && nodes.length; tries++) {
    const n = nodes[Math.floor(Math.random() * nodes.length)];
    const idx = [...n.data].map((ch, i) => (/\S/.test(ch) ? i : -1)).filter((i) => i >= 0);
    const i = idx[Math.floor(Math.random() * idx.length)];
    const two = /\S/.test(n.data[i + 1] ?? "") && Math.random() < 0.5;
    const r = document.createRange();
    r.setStart(n, i); r.setEnd(n, i + (two ? 2 : 1));
    const b = r.getBoundingClientRect();
    if (b.width >= 3 && b.height >= 6 && b.top > 64 && b.bottom < innerHeight - 24 && b.left > 0 && b.right < innerWidth) return r;
  }
  return null;
}

export function Meteors() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reg = typeof Highlight !== "undefined" && "highlights" in CSS ? CSS.highlights : null;
    const stages = [0, 1, 2, 3, 4].map(() => (reg ? new Highlight() : null));
    stages.forEach((h, i) => h && reg?.set(`burn-${i}`, h));
    const style = document.createElement("style");
    style.textContent = BURN_CSS;
    document.head.append(style);

    let cols = 0, rows = 0, img = ctx.createImageData(1, 1), buf = new Uint32Array(img.data.buffer);
    const size = () => {
      cols = Math.ceil(innerWidth / FINE); rows = Math.ceil(innerHeight / FINE);
      cv.width = cols; cv.height = rows;
      cv.style.width = `${cols * FINE}px`; cv.style.height = `${rows * FINE}px`; // whole pixels, so every block is the same size
      img = ctx.createImageData(cols, rows); buf = new Uint32Array(img.data.buffer);
    };
    size();

    const meteors: Meteor[] = [], burns: Burn[] = [], sparks: Spark[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0, last = 0, running = false;

    // Plot in fine pixels; f is coverage, broken up by the same ordered dither as the sky.
    const plot = (x: number, y: number, col: number, f: number) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < cols && y < rows && f > BAYER[(y & 3) * 4 + (x & 3)]) buf[y * cols + x] = col;
    };
    // One sky cell = a 2x2 block, dithered on the sky's grid, so meteors look exactly like they did in the sky.
    // behind: skip cells under the sheet, so ordinary meteors pass behind the page like the rest of the sky.
    let sheet: DOMRect | undefined;
    const plotCell = (cx: number, cy: number, col: number, f: number, behind = false) => {
      cx = Math.round(cx); cy = Math.round(cy);
      const x = cx * CELL, y = cy * CELL;
      const onSheet = !!sheet && x + CELL > sheet.left && x < sheet.right && y + CELL > sheet.top && y < sheet.bottom;
      if (behind && onSheet) return;
      // Over open sky the near clouds are in front of the meteor, the way they drift across the moon.
      const nc = nearCloud;
      if (!onSheet && cx >= 0 && cy >= 0 && cx < nc.cols && cy < nc.rows) f *= 1 - Math.min(1, nc.f[cy * nc.cols + cx] * 1.2);
      if (f <= BAYER[(cy & 3) * 4 + (cx & 3)]) return;
      const s = CELL / FINE;
      for (let oy = 0; oy < s; oy++) for (let ox = 0; ox < s; ox++) plot(cx * s + ox, cy * s + oy, col, 1);
    };

    const ignite = (range: Range, now: number) => {
      const b = range.getBoundingClientRect();
      if (!b.width) return;
      const big = b.height > 36;
      burns.push({ range, t0: now, big, flick: 1, next: now });
      const cx = b.left + b.width / 2, cy = b.top + b.height * 0.45;
      for (let i = 0; i < (big ? 12 : 8); i++) { // the impact: a small splash of sparks thrown up and out, falling back
        const a = rand(-Math.PI * 0.9, -Math.PI * 0.1), v = rand(100, big ? 300 : 240);
        sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 520, t0: now, life: rand(0.25, 0.55), c0: 0, size: big ? 2 : 1 });
      }
    };

    // Everything below is in css px. A real shower has a radiant: every streak traces back to one point.
    // Here that point is the moon, and the shower runs right to left. Where the moon sits on the left
    // (phones), the radiant moves just off the top-right corner so the direction never flips.
    const radiant = () => (moonAt.x > innerWidth / 2 ? moonAt : { x: innerWidth + 40, y: moonAt.y > 0 ? moonAt.y : innerHeight * 0.12, r: 0 });
    const launch = (aim: boolean) => {
      if (document.documentElement.dataset.theme === "day") return; // no shooting stars in daylight
      const now = performance.now() / 1000, m = radiant();
      const sh = document.querySelector(".sheet")?.getBoundingClientRect();
      const inSheet = (x: number, y: number) => !!sh && x > sh.left - 16 && x < sh.right + 16 && y > sh.top - 16 && y < sh.bottom + 16;
      const range = aim ? pickLetter() : null;
      const W = innerWidth, H = innerHeight, left = sh && W - sh.right > 120 ? sh.right + 40 : W + 10;
      let hit: Meteor | null = null;
      if (range) {
        // Aim: start in the open sky right of the page like the others, and solve an exact falling arc onto the letter.
        // Random start, steepness and start angle, so every hit has its own arc length and curl.
        const b = range.getBoundingClientRect();
        const px = b.left + b.width / 2, py = b.top + b.height * 0.45;
        for (let i = 0; i < 12 && !hit; i++) {
          const x0 = rand(left, Math.max(left, W - 30)), dx = x0 - px, k = rand(0.15, 0.75), y0 = py - dx * k; // k: drop per px across
          if (y0 < 12 || inSheet(x0, y0) || Math.hypot(x0 - m.x, y0 - m.y) < m.r + 12) continue;
          const dy = py - y0, a0 = Math.min(rand(0, 14) * Math.PI / 180, Math.atan(k * 0.9)); // start angle: never above level
          const T = Math.min(1.8, Math.max(0.5, Math.hypot(dx, dy) * 1.1 / rand(480, 720)));
          const vx = -dx / T, vy = (dx / T) * Math.tan(a0), g = (2 * (dy - vy * T)) / (T * T); // lands exactly on the letter
          hit = { x: x0, y: y0, vx, vy, g, t0: now, life: T, range };
        }
      }
      if (hit) meteors.push(hit);
      else {
        // Like a sketch of falling stars: each starts somewhere in the open sky right of the page, from the moon's
        // height down to the lower screen, leaves almost level, and curls down to a set end angle as it goes behind the page.
        let sx = 0, sy = 0, ok = false;
        for (let i = 0; i < 12 && !ok; i++) {
          sx = rand(left, Math.max(left, W - 30)); sy = rand(Math.max(20, m.y - m.r), H * 0.8);
          ok = !inSheet(sx, sy) && Math.hypot(sx - m.x, sy - m.y) > m.r + 12; // never inside the page box or on the moon
        }
        if (!ok) return;
        const v = rand(FREE_SPEED[0], FREE_SPEED[1]), T = rand(FREE_LIFE[0], FREE_LIFE[1]);
        const a0 = rand(3, 15) * Math.PI / 180, a1 = rand(38, 55) * Math.PI / 180; // start and end angle below horizontal
        const vx = -Math.cos(a0) * v, vy = Math.sin(a0) * v;
        const g = (Math.tan(a1) * -vx - vy) / T; // gravity that bends a0 into exactly a1 by the end of the flight
        meteors.push({ x: sx, y: sy, vx, vy, g, t0: now, life: T, range: null });
      }
      kick();
    };

    const shower = () => {
      if (document.hidden) { timers.push(setTimeout(shower, 5000)); return; } // nobody is watching; try again shortly
      const n = SHOWER[0] + Math.floor(Math.random() * (SHOWER[1] - SHOWER[0] + 1));
      const hit = Math.random() < AIM ? Math.floor(Math.random() * n) : -1; // at most one per shower lands on a letter
      let at = 0;
      for (let j = 0; j < n; j++) {
        timers.push(setTimeout(() => launch(j === hit), at * 1000));
        at += rand(GAP[0], GAP[1]);
      }
      timers.push(setTimeout(shower, (at + REST) * 1000));
    };
    timers.push(setTimeout(shower, FIRST * 1000)); // after the name's own entrance has played

    const loop = (ms: number) => {
      const now = ms / 1000, dt = last ? Math.min(0.1, now - last) : 0;
      last = now;
      buf.fill(0);
      sheet = document.querySelector(".sheet")?.getBoundingClientRect();

      for (let j = meteors.length - 1; j >= 0; j--) {
        const m = meteors[j], age = now - m.t0, behind = !m.range; // only the one aimed at a letter flies in front of the page
        if (m.range && !m.hit && age >= m.life) { m.hit = true; ignite(m.range, now); }
        // Aimed meteors stop at the letter and their tail drains into it; free ones fade out mid-flight.
        if (age > (m.range ? m.life + TAIL * CELL / SPEED : m.life)) { meteors.splice(j, 1); continue; }
        const fade = Math.min(1, age / 0.12) * (m.range ? 1 : Math.min(1, (m.life - age) / 0.4));
        const at = (q: number) => [(m.x + m.vx * q) / CELL, (m.y + m.vy * q + 0.5 * m.g * q * q) / CELL];
        // The sky's original meteor: the tail traces the arc back in time, one cell per sample, two cells thick near the head.
        const dq = CELL / Math.hypot(m.vx, m.vy);
        for (let k = TAIL - 1; k >= 0; k--) {
          const q = age - k * dq;
          if (q < 0 || q > m.life) continue;
          const [x, y] = at(q), r = k / TAIL, f = fade * (1 - r * r * 0.9); // stays solid most of the way, breaks up at the end
          const col = MET[r < 0.08 ? 0 : r < 0.35 ? 1 : r < 0.65 ? 2 : 3];
          plotCell(x, y, col, f, behind);
          if (r < 0.5) plotCell(x, y + 1, col, f * 0.9, behind);
        }
        if (age < m.life) { // the head: a 2x2 white-gold core in a one-cell yellow glow, corners rounded
          const [hx, hy] = at(age);
          for (let oy = -3; oy <= 4; oy++) // first, a sparse dithered pool of sky light around it, like the moon's halo
            for (let ox = -3; ox <= 4; ox++) {
              const d = Math.hypot(ox - 0.5, oy - 0.5);
              const gx = Math.round(hx + ox) * 2, gy = Math.round(hy + oy) * 2; // CELL / FINE = 2; never paint over the tail
              if (d > 1.6 && d < 4 && !buf[gy * cols + gx]) plotCell(hx + ox, hy + oy, GLOW, fade * 0.45 * (1 - (d - 1.6) / 2.4), behind);
            }
          for (let oy = -1; oy <= 2; oy++)
            for (let ox = -1; ox <= 2; ox++) {
              const ex = ox < 0 || ox > 1, ey = oy < 0 || oy > 1;
              if (ex && ey) continue;
              plotCell(hx + ox, hy + oy, ex || ey ? MET[1] : MET[0], ex || ey ? fade : 1, behind);
            }
        }
      }

      stages.forEach((h) => h?.clear());
      for (let j = burns.length - 1; j >= 0; j--) {
        const bn = burns[j], a = now - bn.t0;
        if (a > FLASH + BURN + COOL) { burns.splice(j, 1); continue; }
        if (now >= bn.next) { bn.flick = Math.random() < 0.3 + 0.4 * (a / (FLASH + BURN)) ? 2 : 1; bn.next = now + rand(0.06, 0.14); } // stepped flicker, hotter early
        const stage = a < FLASH ? 0 : a < FLASH + BURN ? bn.flick : a < FLASH + BURN + COOL * 0.5 ? 3 : 4;
        stages[stage]?.add(bn.range);
        const b = bn.range.getBoundingClientRect(); // re-read every frame, so the fire follows the letter when the page scrolls
        if (!b.width) continue;
        const heat = a < FLASH + BURN ? 1 : 1 - (a - FLASH - BURN) / COOL;
        let n = 26 * Math.min(4, Math.max(1, b.width / 9)) * heat * dt;
        for (; n > 0; n--) {
          if (n < 1 && Math.random() > n) break; // fractional spawns
          const ember = Math.random() < 0.06;
          sparks.push({
            x: rand(b.left, b.right), y: b.top + b.height * rand(0.2, 0.55),
            vx: rand(-25, 25), vy: -rand(ember ? 30 : 70, ember ? 60 : 140) * (bn.big ? 1.3 : 1), g: ember ? -10 : -40,
            t0: now, life: ember ? rand(0.9, 1.4) : rand(0.35, 0.75), c0: ember ? 3 : 1, size: bn.big ? 2 : 1,
          });
        }
      }

      for (let j = sparks.length - 1; j >= 0; j--) {
        const s = sparks[j], r = (now - s.t0) / s.life;
        if (r >= 1) { sparks.splice(j, 1); continue; }
        s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const col = FIRE[Math.min(FIRE.length - 1, s.c0 + Math.floor(r * (FIRE.length - s.c0)))], f = 1 - r * r;
        const x = s.x / FINE, y = s.y / FINE;
        for (let oy = 0; oy < s.size; oy++) for (let ox = 0; ox < s.size; ox++) plot(x + ox, y + oy, col, f);
      }

      ctx.putImageData(img, 0, 0);
      if (meteors.length || burns.length || sparks.length) raf = requestAnimationFrame(loop);
      else { running = false; stages.forEach((h) => h?.clear()); }
    };
    const kick = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } };

    let pending = 0;
    const resize = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(size); };
    addEventListener("resize", resize);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf); cancelAnimationFrame(pending);
      removeEventListener("resize", resize);
      stages.forEach((_, i) => reg?.delete(`burn-${i}`));
      style.remove();
    };
  }, []);

  return <canvas ref={ref} className="meteors" aria-hidden="true" />;
}
