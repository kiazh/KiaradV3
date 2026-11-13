import { CloudBand } from "./CloudBand";
import { Meteors } from "./Meteors";
import { SITE_SKY, type Sky } from "../lib/sky";
import { CommandPalette, type PaletteItem } from "./CommandPalette";
import { projects } from "../lib/projects";
import { EMAIL, LINKS, RESUME } from "../lib/site";

const ITEMS: PaletteItem[] = [
  { group: "Jump to", label: "Now", href: "/#now" },
  { group: "Jump to", label: "Education", href: "/#education" },
  { group: "Jump to", label: "Projects", href: "/#projects" },
  { group: "Jump to", label: "Interests", href: "/#interests" },
  ...projects.map((p) => ({ group: "Projects", label: p.name, hint: p.year, href: `/projects/${p.slug}` })),
  ...(RESUME ? [{ group: "Open", label: "Resume", href: RESUME }] : []),
  { group: "Open", label: "Copy email", copy: EMAIL },
  ...LINKS.map(([label, href]) => ({ group: "Open", label, href })),
];

// The sky, scroll progress and search: shared by the home page and every project page.
export function Shell({ children, sky = SITE_SKY }: { children: React.ReactNode; sky?: Sky }) {
  return (
    <div className="site">
      <div className="progress" aria-hidden="true" />
      <CloudBand sky={{ ...sky, meteors: false }} />{/* meteors fly above the page instead, in <Meteors /> */}
      <div className="controls"><CommandPalette items={ITEMS} /></div>
      {children}
      {sky.meteors && <Meteors />}
    </div>
  );
}
