"use client";

import { useSyncExternalStore } from "react";

// Night (the default) or day. The choice lives on <html data-theme>, set before paint by the script in
// app/layout.tsx; the sky (CloudBand) watches the attribute and turns the moon into the sun.
const px = (cells: string[]) =>
  cells.flatMap((row, y) => [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)));

const SUN = px([
  "....#....",
  ".#.....#.",
  "...###...",
  "..#####..",
  "#.#####.#",
  "..#####..",
  "...###...",
  ".#.....#.",
  "....#....",
]);
const MOON = px([
  "...####..",
  ".####....",
  ".###.....",
  "###......",
  "###......",
  "###......",
  ".###.....",
  ".####....",
  "...####..",
]);

// Subscribes to <html data-theme>, so the button always matches the page (no copied state to drift).
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const isDay = () => document.documentElement.dataset.theme === "day";

export function ThemeToggle() {
  const day = useSyncExternalStore(subscribe, isDay, () => false);

  const flip = () => {
    const next = !day;
    document.documentElement.dataset.theme = next ? "day" : "night";
    try { localStorage.setItem("theme", next ? "day" : "night"); } catch {} // private mode: the choice just isn't remembered
  };

  return (
    <button type="button" className="ctl theme" onClick={flip} data-day={day} aria-label={day ? "Switch to night" : "Switch to day"}>
      <svg className="t-sun" viewBox="0 0 9 9" aria-hidden="true">{SUN}</svg>
      <svg className="t-moon" viewBox="0 0 9 9" aria-hidden="true">{MOON}</svg>
    </button>
  );
}
