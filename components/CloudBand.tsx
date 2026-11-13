"use client";

import { useEffect, useRef } from "react";
import { BAYER, field, hash, oklch, smooth } from "../lib/field";
import type { Sky } from "../lib/sky";

const CELL = 8; // css px per sky pixel, the same on every screen
const BASE_MS = 83; // the sky drifts ~15px/s, so recomputing the clouds at ~12fps is invisible and 5x cheaper
// Pointer timings come from the original site's CursorFollower: trail rate, fade rate and idle hold.
const POS_LAMBDA = 6.3;
const SCALE_LAMBDA = 2.4;
const FADE_LAMBDA = 0.8; // the light fades out 3x slower than it comes in (~1.2s time constant vs ~0.4s)
const IDLE_MS = 900;
// The pointer carries a pool of moonlight that clears the clouds around it.
const LIGHT_R2 = 900; // cells squared: the pool reaches ~30 cells
const POOL_R = Math.sqrt(LIGHT_R2) + 1; // its bounding radius, for partial redraws
const LIGHT_FALL = 190;
const LIGHT_LIFT = 0.42;
// A click leaves a dewdrop of light that dissolves pixel by pixel. Quiet on purpose: no ring, no travel.
const DROP_LIFE = 1.6; // seconds
const DROP_RADIUS = 9; // cells
const MAX_DROPS = 8;
// Moon, in cells.
const MOON_R = 13;
const MOON_TILT = (38 * Math.PI) / 180; // the lit limb faces down and to the right, like a real evening crescent
const SYNODIC = 29.530588853; // days

const rgb32 = (c: number[]) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; // little-endian RGBA
// Night only. Entry 3 is the page colour (--bg).
const PAL = [oklch(0.1, 0.04, 270), oklch(0.15, 0.06, 268), oklch(0.21, 0.07, 264), oklch(0.3, 0.07, 259), oklch(0.4, 0.085, 252), oklch(0.5, 0.085, 245)].map(rgb32);
const STAR = rgb32(oklch(0.94, 0.03, 230));
// Moon: bright outer limb, a softer band toward the terminator, darker craters. No earthshine: the dark side is just sky.
const MOON_HI = rgb32(oklch(0.93, 0.015, 235)), MOON_MID = rgb32(oklch(0.84, 0.02, 238)), MOON_LO = rgb32(oklch(0.72, 0.025, 240));
const G0 = 0.12, G1 = 0.48, K = 0.3; // sky gradient (dark at the top, lighter toward the bottom), cloud strength

/** Moon phase 0..1 (0 new, 0.5 full) from a reference new moon (2000-01-06 18:14 UTC). Checked: 2024-01-11 new -> 0.011, 2024-01-25 full -> 0.493. */
const moonPhase = (ms: number) => ((((ms / 86400000 + 2440587.5 - 2451550.1) / SYNODIC) % 1) + 1) % 1;

/** Where the moon sits, in viewport css px (r = disc radius). Meteors use it as their shower's radiant. */
export const moonAt = { x: -1, y: -1, r: 0 };

type Drop = { x: number; y: number; t0: number };

export function CloudBand({ sky = {} }: { sky?: Sky }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(sky); // stable dependency for an object prop

  useEffect(() => {
    const o: Sky = JSON.parse(key);
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 100lvh is stable when a phone's URL bar collapses; innerHeight is not, and would make the sky jump.
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;width:0;height:100lvh";
    document.body.appendChild(probe);

    let cols = 0, rows = 0, img = ctx.createImageData(1, 1), buf = new Uint32Array(img.data.buffer);
    let cloud = new Float32Array(0), far = new Float32Array(0), rim = new Float32Array(0); // cached per cell; the expensive part
    let mx = 0, my = 0;
    let t = 5, last = 0, lastBase = -1e9, raf = 0, done = 0; // done: rows recomputed so far in the current pass
    let tx = -99, ty = -99, hx = -99, hy = -99, heat = 0, lastMove = -1e9;
    const drops: Drop[] = [];

    const phase = o.moon === "full" ? 0.5 : o.moon === "crescent" ? 0.18 : moonPhase(Date.now());
    const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2; // fraction of the disc that is lit
    const haloK = 0.1 + 0.2 * lit, waxing = phase < 0.5, cosP = Math.cos(2 * Math.PI * phase);
    const tc = Math.cos(MOON_TILT), ts = Math.sin(MOON_TILT);
    const R0 = o.moonR ?? MOON_R;
    let R = R0, HALO_R = R * 4;
    const cell = CELL, u = CELL;

    // The cloud field is the expensive part. Rows are recomputed a slice per frame, spread evenly across
    // BASE_MS, so no single frame stalls (a full recompute in one frame took ~15-20ms on a 2560px window).
    const rimRow = (y: number) => {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (cloud[i] < 0.05) { rim[i] = 0; continue; }
        // Lit edge: this cell has cloud but the cell four steps toward the light has less. Light is the moon, else straight up.
        let ux = 0, uy = -1;
        if (o.moon) { const dx = mx - x, dy = my - y, d = Math.hypot(dx, dy) || 1; ux = dx / d; uy = dy / d; }
        const jx = Math.min(cols - 1, Math.max(0, Math.round(x + ux * 4))), jy = Math.min(rows - 1, Math.max(0, Math.round(y + uy * 4)));
        rim[i] = Math.min(1, Math.max(0, (cloud[i] - cloud[jy * cols + jx]) * 1.4)) * Math.min(1, cloud[i] * 2); // wide, soft, only on real cloud
      }
    };
    const baseRows = (y0: number, y1: number) => {
      for (let y = y0; y < y1; y++)
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, f = field((x * u) / 380, (y * u) / 260, t * 0.8, 2);
          cloud[i] = o.sharp ? smooth((f - 0.52) / 0.16) * 0.95 : Math.max(0, f - 0.4) * 1.5;
          if (o.layers) far[i] = Math.max(0, field((x * u) / 720, (y * u) / 480, t * 0.3, 11) - 0.42) * 1.2;
        }
      if (o.rims) for (let y = Math.max(0, y0 - 4); y < y1; y++) rimRow(y); // rims trail by 4 rows so their neighbours are fresh
    };
    const baseNow = () => baseRows(0, rows);

    // Composes cells [x0,x1) x [y0,y1). Between full passes only the area around the cursor and drops changes.
    const compose = (x0 = 0, y0 = 0, x1 = cols, y1 = rows) => {
      const n = PAL.length;
      const parting = heat > 0.01;
      const live = drops.map((r) => ({ x: r.x, y: r.y, k: 1 - (t - r.t0) / DROP_LIFE })); // k: 1 -> 0 as it dissolves
      for (let y = y0; y < y1; y++) {
        const yy = y / rows, a = K, b = G0 + G1 * yy; // clouds run all the way to the bottom edge
        for (let x = x0; x < x1; x++) {
          const i = y * cols + x, th = BAYER[(y & 3) * 4 + (x & 3)];
          let near = cloud[i], lift = 0;
          if (parting) {
            const dx = x - hx, dy = y - hy, d2 = dx * dx + dy * dy;
            if (d2 < LIGHT_R2) { const f = heat * Math.exp(-d2 / LIGHT_FALL); near *= 1 - f; lift = LIGHT_LIFT * f; }
          }
          const c = o.layers ? near + far[i] * 0.75 * (1 - near) : near; // the near layer hides the far one
          let v = b + a * c + lift;
          if (o.rims) v += 0.15 * rim[i];
          let moonPx = 0, behindMoon = false;
          if (o.moon) {
            const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
            if (d2 < HALO_R * HALO_R) {
              const d = Math.sqrt(d2);
              if (d < R) {
                // Depth: the moon sits between the layers. It hides the far clouds; the near clouds drift across it,
                // breaking up in a dither at their edges and glowing where the moon lights them from behind.
                behindMoon = true;
                const u0 = dx / R, w0 = dy / R, u = u0 * tc + w0 * ts, w = -u0 * ts + w0 * tc; // rotate into the moon's frame
                const xt = Math.sqrt(Math.max(0, 1 - w * w)) * cosP;
                const s = waxing ? u - xt : -xt - u; // > 0 on the lit side; grows toward the outer limb
                if (near > 0.1 + th * 0.4) v = b + a * near + 0.3 * Math.min(1, near * 2) + lift; // cloud in front, backlit
                else if (s > (th - 0.5) * 0.12) moonPx = field(u * 3 + 4, w * 3 + 4, 0, 21) > 0.64 ? MOON_LO : s < 0.09 + th * 0.08 ? MOON_MID : MOON_HI;
                else v = b + lift; // the unlit side is plain sky, and hides what is behind it
                v += haloK * 0.5;
              } else v += haloK * Math.exp(-(d - R) / 6);
            }
          }
          for (const w of live) {
            const dx = x - w.x, dy = y - w.y, d2 = dx * dx + dy * dy;
            // Ordered dissolve: each pixel switches off when the drop's strength falls below its Bayer threshold.
            if (d2 < DROP_RADIUS * DROP_RADIUS && th < w.k) v += 0.34 * (1 - Math.sqrt(d2) / DROP_RADIUS);
          }
          if (moonPx) { buf[i] = moonPx; continue; }
          let out = PAL[Math.min(n - 1, Math.max(0, Math.floor(v * (n - 1) + th)))];
          // Stars sit in the dark upper sky and twinkle slowly; clouds and moonlight swallow them.
          if (!behindMoon && yy < 0.5 && v < 0.3 && hash(x, y, 9) < 0.004 && Math.sin(t * 1.2 + hash(x, y, 11) * 6.283) > -0.3) out = STAR;
          buf[i] = out;
        }
      }
      ctx.putImageData(img, 0, 0, x0, y0, x1 - x0, y1 - y0);
    };

    const size = () => {
      const w = innerWidth, h = probe.offsetHeight || innerHeight;
      const c = Math.ceil(w / cell), r = Math.ceil(h / cell);
      if (c === cols && r === rows) return false;
      cols = c; rows = r;
      cv.width = cols; cv.height = rows;
      // Exactly `cell` css px per cell, so every pixel block is the same size (a stretched canvas gives uneven blocks).
      cv.style.width = `${cols * cell}px`; cv.style.height = `${rows * cell}px`;
      img = ctx.createImageData(cols, rows); buf = new Uint32Array(img.data.buffer);
      cloud = new Float32Array(cols * rows); far = new Float32Array(cols * rows); rim = new Float32Array(cols * rows);
      // The moon sits in the gutter right of the sheet, sized to fit it. Where the sheet fills the width
      // (phones, portrait tablets) it shrinks into the band above the sheet, on the left, clear of the search button.
      const sh = document.querySelector(".sheet")?.getBoundingClientRect();
      const gutter = sh ? w - sh.right : w * 0.25, top = sh ? sh.top + scrollY : 72, fit = (gutter * 0.4) / cell;
      if (fit >= 6) { R = Math.min(R0, fit); mx = (w - gutter / 2) / cell; my = Math.max(R * 2 + 4, rows * 0.16); }
      else { R = Math.max(4, Math.min(R0, Math.floor((top * 0.4) / cell))); mx = R + 3; my = top / 2 / cell; }
      HALO_R = R * 4;
      moonAt.x = mx * cell; moonAt.y = my * cell; moonAt.r = o.moon ? R * cell : 0;
      return true;
    };
    const repaint = () => { baseNow(); compose(); };

    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; // dt-based, so refresh rate doesn't change the feel
      last = now; t += dt;
      const want = now - lastMove < IDLE_MS ? 1 : 0;
      heat += (want - heat) * (1 - Math.exp(-dt * (want > heat ? SCALE_LAMBDA : FADE_LAMBDA)));
      const k = 1 - Math.exp(-dt * POS_LAMBDA);
      const phx = hx, phy = hy;
      hx += (tx - hx) * k; hy += (ty - hy) * k;
      while (drops.length && t - drops[0].t0 >= DROP_LIFE) drops.shift();
      // Advance the rolling recompute to where it should be at this point of the pass; compose when a pass completes.
      const target = Math.min(rows, Math.ceil(((now - lastBase) / BASE_MS) * rows));
      if (target > done) { baseRows(done, target); done = target; }
      const fresh = done >= rows;
      if (fresh) { done = 0; lastBase = now; }
      if (fresh) compose(); // a full pass
      else if (heat > 0.01 || drops.length) {
        // Only the cursor's pool (where it was and where it is now) and the drops changed.
        let rx0 = cols, ry0 = rows, rx1 = 0, ry1 = 0;
        const add = (cx: number, cy: number, r: number) => {
          rx0 = Math.min(rx0, Math.floor(cx - r)); ry0 = Math.min(ry0, Math.floor(cy - r));
          rx1 = Math.max(rx1, Math.ceil(cx + r)); ry1 = Math.max(ry1, Math.ceil(cy + r));
        };
        if (heat > 0.01) { add(phx, phy, POOL_R); add(hx, hy, POOL_R); }
        for (const d of drops) add(d.x, d.y, DROP_RADIUS + 1);
        rx0 = Math.max(0, rx0); ry0 = Math.max(0, ry0); rx1 = Math.min(cols, rx1); ry1 = Math.min(rows, ry1);
        if (rx1 > rx0 && ry1 > ry0) compose(rx0, ry0, rx1, ry1);
      }
      raf = requestAnimationFrame(loop);
    };

    const move = (e: PointerEvent) => {
      tx = e.clientX / cell; ty = e.clientY / cell; lastMove = performance.now();
      if (hx < -50) { hx = tx; hy = ty; }
    };
    const down = (e: PointerEvent) => {
      drops.push({ x: e.clientX / cell, y: e.clientY / cell, t0: t });
      if (drops.length > MAX_DROPS) drops.shift();
    };
    let pending = 0;
    const resize = () => { // one resize per frame, not one per event
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => { if (size()) repaint(); });
    };

    size();
    repaint();
    cv.classList.add("ready");
    addEventListener("resize", resize);
    if (!still) {
      raf = requestAnimationFrame(loop);
      addEventListener("pointermove", move);
      addEventListener("pointerdown", down);
    }
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(pending);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      probe.remove();
    };
  }, [key]);

  return <canvas ref={ref} className="clouds" aria-hidden="true" />;
}
