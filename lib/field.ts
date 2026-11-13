// One cloud field, shared by every pixel hero and the ASCII band. Pure, so it is easy to test.
const clamp = (t: number) => Math.min(1, Math.max(0, t));
export const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};

export function hash(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, s: number) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 3; i++) {
    sum += amp * vnoise(x * f, y * f, s + i);
    f *= 2;
    amp *= 0.5;
  }
  return sum;
}

/** Cloud density 0..1 at a pixel position (px / 360), warped so it drifts like weather. */
// Three octaves: the fourth was under a dither step in amplitude, invisible but a quarter of the cost.
export function field(x: number, y: number, t: number, seed: number) {
  const w = fbm(x * 0.9 + t * 0.03, y * 0.9, seed + 7);
  const v = fbm(x * 1.6 + w * 1.6 + t * 0.05, y * 1.6 + w * 1.6, seed);
  return clamp((v - 0.2) / 0.6);
}

export type RGB = [number, number, number];

export function oklch(l: number, c: number, h: number): RGB {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const enc = (x: number) => Math.round(255 * (clamp(x) <= 0.0031308 ? 12.92 * clamp(x) : 1.055 * clamp(x) ** (1 / 2.4) - 0.055));
  return [enc(lin[0]), enc(lin[1]), enc(lin[2])];
}

/** 4x4 ordered-dither thresholds in [0,1). */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => n / 16);
