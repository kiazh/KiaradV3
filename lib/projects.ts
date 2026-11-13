import { projects as base, type Project } from "./content";

// To add a project: add it to ../lib/content.ts (name, blurb, description, github, year), then optionally
// describe its showcase below. Drop images in public/projects/ and reference them as "/projects/<file>".
// A project with no cover gets a generated pixel cover, so the layout never has an empty slot.
export type Media = { src: string; alt: string };
type Extra = {
  tags?: string[];
  featured?: boolean; // shown as a large card on the home page
  cover?: Media;
  gallery?: Media[]; // screenshots, diagrams, demos: shown on the project page
  links?: { label: string; href: string }[]; // live demo, paper, write-up
};

const EXTRA: Record<string, Extra> = {
  Machina: { tags: ["Python", "TypeScript", "PostgreSQL"], featured: true, cover: { src: "/projects/machina.jpg", alt: "Machina's terminal UI: chat on the left, editor in the middle, file explorer on the right" } },
  MLscratch: { tags: ["C"], featured: true },
  "AES-128": { tags: ["Go", "FIPS 197"], featured: true },
  "Facial Recognition": { tags: ["TensorFlow", "OpenCV"] },
  Esp32Network: { tags: ["scikit-learn", "ESP32", "C"] },
};

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Projects only the redesign lists; ../lib/content.ts is shared with the original site.
const HIDDEN = new Set(["Cube"]); // still on the original site, not shown here
const OWN: Project[] = [
  {
    name: "Machina",
    blurb: "a self-hosted multi-agent AI harness",
    description: "A self-hosted AI agent harness that runs in the terminal. Agents share PostgreSQL-backed context, RAG and long-term memory, so conversations survive a restart, and it works with cloud providers or local models. It runs as a terminal UI, a CLI, an HTTP API and an MCP server.",
    github: "https://github.com/kiazh/Machina-Harness",
    year: "2026",
    status: null,
  },
];

export const projects = [...OWN, ...base].filter((p) => !HIDDEN.has(p.name)).map((p) => ({ ...p, slug: slugify(p.name), tags: [] as string[], ...EXTRA[p.name] }));
export type ProjectWithMedia = (typeof projects)[number];
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
