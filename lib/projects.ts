import { projects as base } from "./content";

// To add a project: add it to ./content.ts (name, blurb, description, github, year), then optionally
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
  MLscratch: { tags: ["C", "autograd", "MNIST"], featured: true },
  "AES-128": { tags: ["Go", "FIPS 197", "GF(2⁸)"], featured: true },
  "Facial Recognition": { tags: ["TensorFlow", "Keras", "OpenCV"] },
  Esp32Network: { tags: ["scikit-learn", "ESP-IDF", "C"] },
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const projects = base.map((p) => ({ ...p, slug: slugify(p.name), tags: [] as string[], ...EXTRA[p.name] }));
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
