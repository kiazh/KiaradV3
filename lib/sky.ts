// Sky settings live outside the client component so server components (pages, Shell) can read and merge them.

/** Optional layers for the sky drawn by components/CloudBand. */
export type Sky = {
  moon?: "phase" | "crescent" | "full"; // a pixel moon between the cloud layers: tonight's real phase, a fixed crescent, or full
  rims?: boolean; // cloud edges facing the light get brighter, so clouds read as shapes
  sharp?: boolean; // harder cloud edges, more clear sky between them
  layers?: boolean; // a faint, slow, distant cloud layer behind the main one
  meteors?: boolean; // an occasional shooting star
  moonX?: number; moonY?: number; // moon centre as a fraction of the viewport; default upper right
  moonR?: number; // moon radius in cells (default 13)
  metSize?: number; // 1 = default; scales a shooting star's tail, thickness, head and speed
  metCluster?: number; // shooting stars per burst (default 1)
  metSpread?: number; // cells between the streaks of a burst (default 10)
  metSides?: boolean; // start in the side gutters and fly outward, so the sheet never hides them
};

/** The site's sky: chosen in the sky lab (Deep + Meteors, crescent moon). */
export const SITE_SKY: Sky = { moon: "crescent", rims: true, sharp: true, layers: true, meteors: true };
