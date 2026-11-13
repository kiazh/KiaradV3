import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScrambleText } from "@/components/ScrambleText"; // the original site's component, unchanged
import { ProjectCover } from "../../../components/ProjectCover";
import { Ext } from "../../../components/Ext";
import { Shell } from "../../../components/Shell";
import { getProject, projects } from "../../../lib/projects";
import { cap, ext } from "../../../lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => projects.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProject((await params).slug);
  return p ? { title: `${p.name} · Kiarad`, description: cap(p.blurb) } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const i = projects.findIndex((x) => x.slug === p.slug);
  const prev = projects[(i + projects.length - 1) % projects.length], next = projects[(i + 1) % projects.length];
  const links = [{ label: "Source on GitHub", href: p.github }, ...(p.links ?? [])];

  return (
    <Shell>
      <main className="sheet project">
        <a className="back" href="/#projects"><i className="chev back-chev" aria-hidden="true" />Projects</a>
        <header>
          <h1><ScrambleText text={p.name} trigger="mount-then-hover" delayMs={120} as="span" /></h1>
          <p className="tag">{cap(p.blurb)}</p>
          <p className="facts"><span className="year">{p.year}</span>{p.tags.map((t) => <span key={t} className="tagchip">{t}</span>)}</p>
        </header>

        <ProjectCover name={p.name} cover={p.cover} className="hero-cover" />

        <section className="prose">
          <p>{p.description}</p>
          <p className="contact">{links.map((l) => <a key={l.href} href={l.href} {...ext}>{l.label}<Ext /></a>)}</p>
        </section>

        {p.gallery && p.gallery.length > 0 && (
          <section className="gallery" aria-label="Gallery">
            {p.gallery.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.src} src={m.src} alt={m.alt} loading="lazy" decoding="async" />
            ))}
          </section>
        )}

        <nav className="pn" aria-label="More projects">
          <a href={`/projects/${prev.slug}`}><span className="sub">Previous</span><span className="pn-name"><i className="chev back-chev" aria-hidden="true" />{prev.name}</span></a>
          <a href={`/projects/${next.slug}`}><span className="sub">Next</span><span className="pn-name">{next.name}<i className="chev" aria-hidden="true" /></span></a>
        </nav>
      </main>
    </Shell>
  );
}
