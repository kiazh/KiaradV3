import type { CSSProperties } from "react";

// A pixel-art sparkle for the name, on the same square grain as the sky. 11x11 grid, centre (5,5).
// Arms taper from a white core to deep gold; "tip" pixels only light up when it twinkles.
type Px = [x: number, y: number, tip?: boolean];

const arm = (r: number, tipFrom: number, vertical: boolean): Px[] =>
  Array.from({ length: r }, (_, i) => i + 1).flatMap((d) => {
    const tip = d >= tipFrom;
    return vertical ? [[5, 5 - d, tip], [5, 5 + d, tip]] : [[5 - d, 5, tip], [5 + d, 5, tip]];
  });

const PIXELS: Px[] = [
  [5, 5],
  ...arm(5, 5, true), // long vertical arm, outermost pixel twinkles
  ...arm(5, 4, false), // shorter horizontal arm
  [4, 4], [6, 4], [4, 6], [6, 6], // inner glints
  [3, 3, true], [7, 3, true], [3, 7, true], [7, 7, true], // outer glints, twinkle only
];

const tone = (x: number, y: number) => Math.min(4, Math.max(Math.abs(x - 5), Math.abs(y - 5)));

// Entrance arc, in em relative to the star's centre: from the top of the K, over the name, into the star.
// Quadratic Bezier sampled densely, snapped to the star's own pixel size, de-duplicated, so it reads as pixels.
const PX = 0.72 / 11; // one star pixel, in em
const P0 = [-2.95, 0.2], P1 = [-1.5, -1.3], P2 = [0, 0];
const ARC = (() => {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (let s = 0; s <= 200; s++) {
    const t = s / 200, u = 1 - t;
    const x = Math.round((u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0]) / PX);
    const y = Math.round((u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]) / PX);
    if (!seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); out.push([x, y]); }
  }
  return out.slice(0, -3); // the last few land inside the star itself
})();

export function Star() {
  return (
    <span className="star" aria-hidden="true">
      <span className="arc">
        {ARC.map(([x, y], i) => (
          <i key={i} style={{ "--x": x, "--y": y, "--f": i / ARC.length } as CSSProperties} />
        ))}
      </span>
      <svg viewBox="0 0 11 11" shapeRendering="crispEdges">
        {PIXELS.map(([x, y, tip]) => (
          <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" className={`t${tone(x, y)}${tip ? " tip" : ""}`} />
        ))}
      </svg>
    </span>
  );
}
