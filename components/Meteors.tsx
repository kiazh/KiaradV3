"use client";

import { useEffect, useRef } from "react";
import { BAYER, oklch } from "../lib/field";
import { moonAt } from "./CloudBand";

// Shooting stars, drawn above everything. Showers of 1-4, well spaced, radiating from the moon, then the sky rests.
// Now and then one lands on a real letter and sets it alight: the letter itself is recoloured through the
// CSS Custom Highlight API (no DOM changes, so React never notices), and pixel flames rise off it here.
const FINE = 4; // css px per overlay pixel: flames are this fine, so they sit in proportion to body text
const CELL = 8; // css px per sky cell: meteors keep the sky's grain and their original size
const SPEED = 640, G = 110, FREE_LIFE = 1.3; // css px/s, px/s² (a slight sag, so streaks stay nearly straight like real ones), max s
const TAIL = 34; // tail samples, one sky cell apart
const SHOWER = [1, 4], GAP = [1.2, 3.2], REST = 30, FIRST = 4.5, AIM = 0.35; // count, s apart, s rest, s to first, P(a shower has a hit)
const FLASH = 0.15, BURN = 1.8, COOL = 1; // s: white-hot impact, burning, cooling back to normal

const rgb32 = (c: number[]) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
// Head to tail: white, pale gold, gold, then a dim amber the dither thins out into nothing.
const MET = [oklch(0.99, 0.02, 95), oklch(0.93, 0.09, 92), oklch(0.82, 0.13, 82), oklch(0.62, 0.11, 60)].map(rgb32);
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

type Meteor = { x: number; y: number; vx: number; vy: number; t0: number; life: number; range: Range | null; hit?: boolean };
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
      if (f <= BAYER[(cy & 3) * 4 + (cx & 3)]) return;
      if (behind && sheet) {
        const x = cx * CELL, y = cy * CELL;
        if (x + CELL > sheet.left && x < sheet.right && y + CELL > sheet.top && y < sheet.bottom) return;
      }
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
    // Here that point is the moon, so meteors fan out from just beyond its disc across the page.
    const radiant = () => (moonAt.x >= 0 ? moonAt : { x: innerWidth * 0.85, y: innerHeight * 0.15, r: 0 });
    const launch = (aim: boolean) => {
      const now = performance.now() / 1000, W = innerWidth, H = innerHeight, m = radiant();
      const sh = document.querySelector(".sheet")?.getBoundingClientRect();
      const inSheet = (x: number, y: number) => !!sh && x > sh.left - 16 && x < sh.right + 16 && y > sh.top - 16 && y < sh.bottom + 16;
      const range = aim ? pickLetter() : null;
      let x0 = 0, y0 = 0, px = 0, py = 0;
      if (range) {
        // Aim: leave the moon on the line toward the letter, never from inside the page (back off toward the moon).
        const b = range.getBoundingClientRect();
        px = b.left + b.width / 2; py = b.top + b.height * 0.45;
        const d = Math.hypot(px - m.x, py - m.y) || 1, ux = (px - m.x) / d, uy = (py - m.y) / d;
        let off = m.r + rand(20, 60);
        while (off > m.r && inSheet(m.x + ux * off, m.y + uy * off)) off -= 8;
        x0 = m.x + ux * off; y0 = m.y + uy * off;
      }
      if (range && !inSheet(x0, y0)) { // if the moon itself is behind the page (narrow screens), skip the hit this time
        // Fall along an exact gravity arc onto the letter.
        const T = Math.min(1.5, Math.max(0.6, Math.hypot(px - x0, py - y0) / SPEED));
        meteors.push({ x: x0, y: y0, vx: (px - x0) / T, vy: (py - y0 - 0.5 * G * T * T) / T, t0: now, life: T, range });
      } else {
        // Fan out from the moon toward a random patch of open sky (not under the page), starting a little way out.
        let tx = W * 0.5, ty = H * 0.5;
        for (let i = 0; i < 30; i++) {
          const x = rand(0, W), y = rand(0, H * 0.75);
          if (!inSheet(x, y) && Math.hypot(x - m.x, y - m.y) > m.r + 180) { tx = x; ty = y; break; }
        }
        const a = Math.atan2(ty - m.y, tx - m.x), ux = Math.cos(a), uy = Math.sin(a);
        let off = m.r + rand(30, 160);
        while (off > m.r && inSheet(m.x + ux * off, m.y + uy * off)) off -= 8; // never spawn inside the page box
        if (inSheet(m.x + ux * off, m.y + uy * off)) return; // moon is behind the page: skip this one
        meteors.push({ x: m.x + ux * off, y: m.y + uy * off, vx: ux * SPEED, vy: uy * SPEED, t0: now, life: rand(0.9, FREE_LIFE), range: null });
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
        const at = (q: number) => [(m.x + m.vx * q) / CELL, (m.y + m.vy * q + 0.5 * G * q * q) / CELL];
        // The sky's original meteor: the tail traces the arc back in time, one cell per sample, two cells thick near the head.
        const dq = CELL / SPEED;
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
