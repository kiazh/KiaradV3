"use client";

import { useEffect, useRef } from "react";
import { BAYER, field, oklch } from "../lib/field";
import type { Media } from "../lib/projects";

const CELL = 6;
const HUES = [250, 200, 165, 300, 25, 85];

// A real image when the project has one; otherwise a pixel cover generated from the project's name,
// in the same dithered language as the sky, drifting slowly like the clouds. Same box either way,
// so nothing shifts when an image is added (set `cover` in lib/projects.ts).
export function ProjectCover({ name, cover, className }: { name: string; cover?: Media; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (cover) return <img className={className} src={cover.src} alt={cover.alt} loading="lazy" decoding="async" />;
  return <Generated name={name} className={className} />;
}

const FRAME_MS = 83; // ~12fps, the sky's own rate: the drift is slow, so more frames would be invisible

function Generated({ name, className }: { name: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let seed = 0;
    for (const ch of name) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0;
    seed = Math.abs(seed);
    const hue = HUES[seed % HUES.length];
    const pal = [0.14, 0.26, 0.4, 0.56, 0.72, 0.88].map((l, i) => oklch(l, [0.04, 0.08, 0.12, 0.13, 0.1, 0.04][i], hue + i * 4));
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 0, rows = 0, img = ctx.createImageData(1, 1), t = (seed % 50) / 10, raf = 0, last = 0, seen = false, hover = false;
    const size = () => {
      cols = Math.max(1, Math.ceil(cv.clientWidth / CELL)); rows = Math.max(1, Math.ceil(cv.clientHeight / CELL));
      cv.width = cols; cv.height = rows; img = ctx.createImageData(cols, rows);
    };
    const draw = () => {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const v = field((x * CELL) / 240 + (seed % 17), (y * CELL) / 240, t, seed % 97) * 1.05 + 0.04 * (y / rows);
        const c = pal[Math.min(5, Math.max(0, Math.floor(v * 5 + BAYER[(y & 3) * 4 + (x & 3)])))];
        const i = (y * cols + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      const dt = last ? Math.min(now - last, 200) / 1000 : 0;
      last = now;
      t += dt * (hover ? 2.2 : 0.6); // hovering the card stirs the pattern a little faster
      draw();
    };
    size(); draw();
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(cv);
    // Only animate while the cover is on screen.
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      cancelAnimationFrame(raf); last = 0;
      if (seen && !still) raf = requestAnimationFrame(loop);
    });
    io.observe(cv);
    const card = cv.closest("a");
    const on = () => (hover = true), off = () => (hover = false);
    card?.addEventListener("pointerenter", on); card?.addEventListener("pointerleave", off);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      card?.removeEventListener("pointerenter", on); card?.removeEventListener("pointerleave", off);
    };
  }, [name]);

  return <canvas ref={ref} className={className} role="img" aria-label={`${name} cover`} />;
}
