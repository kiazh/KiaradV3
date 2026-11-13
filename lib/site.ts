import { currently } from "./content";

export const EMAIL = "kia.zheidari@gmail.com";
export const RESUME = currently.find((c) => c.label === "resume")?.href;
export const LINKS: [string, string][] = [
  ["GitHub", "https://github.com/kiazh"],
  ["LinkedIn", "https://www.linkedin.com/in/kiazh"],
  ["Discord", "https://discord.com/users/431549003449237505"],
  ["MyAnimeList", "https://myanimelist.net/profile/ki_shadow"],
];
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
export const TAGLINE = "Math-Phys @ UWaterloo";
export const NOW = currently.filter((c) => c.label !== "resume");
