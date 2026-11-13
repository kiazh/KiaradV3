// Sky settings live outside the client component so server components (pages, Shell) can read and merge them.

/** Optional layers for the sky drawn by components/CloudBand. */
export type Sky = {
  moon?: "phase" | "crescent" | "full"; // a pixel moon between the cloud layers: tonight's real phase, a fixed crescent, or full
  rims?: boolean; // cloud edges facing the light get brighter, so clouds read as shapes
  sharp?: boolean; // harder cloud edges, more clear sky between them
  layers?: boolean; // a faint, slow, distant cloud layer behind the main one
  meteors?: boolean; // shooting-star showers above the page (components/Meteors)
  moonR?: number; // moon radius in cells (default 13)
};

/** The site's sky: chosen in the sky lab (Deep + Meteors, crescent moon). */
export const SITE_SKY: Sky = { moon: "crescent", rims: true, sharp: true, layers: true, meteors: true };
