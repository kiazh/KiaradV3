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

export function Star() {
  return (
    <span className="star" aria-hidden="true">
      <span className="streak" />
      <svg viewBox="0 0 11 11" shapeRendering="crispEdges">
        {PIXELS.map(([x, y, tip]) => (
          <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" className={`t${tone(x, y)}${tip ? " tip" : ""}`} />
        ))}
      </svg>
    </span>
  );
}
