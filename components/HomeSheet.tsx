import type { CSSProperties } from "react";
import { interests, tabs } from "@/lib/content";
import { getDestinyStatus } from "@/lib/destiny";
import { DestinyStatus } from "@/components/DestinyStatus";
import { SpotifyNowPlaying } from "@/components/SpotifyNowPlaying";
import { ScrambleText } from "@/components/ScrambleText"; // the original site's component, unchanged
import { CopyEmail } from "./CopyEmail";
import { Ext } from "./Ext";
import { ProjectCover } from "./ProjectCover";
import { Social } from "./Social";
import { projects } from "@/lib/projects";
import { cap, EMAIL, ext, NOW, RESUME, TAGLINE } from "@/lib/site";

const step = (i: number) => ({ "--i": i }) as CSSProperties;

const summary = (t: (typeof tabs)[number]) => {
  const { items, body } = interests[t];
  return items?.length ? items.map((i) => i.title).join(" · ") : body.split(". ")[0].replace(/\.$/, "");
};

// The home page body.
export async function HomeSheet() {
  const destiny = await getDestinyStatus(); // server-side, so the raid ships in the first HTML
  const featured = projects.filter((p) => p.featured);
  return (
    <>
      <SpotifyNowPlaying />
      <main className="sheet">
        <header>
          <h1 className="rise" style={step(0)}><ScrambleText text="Kiarad" trigger="mount-then-hover" delayMs={120} as="span" /></h1>
          <p className="tag rise" style={step(1)}>{TAGLINE}</p>
          <p className="contact">
            {RESUME && <a className="btn rise" style={step(2)} href={RESUME} {...ext}>Resume<Ext /></a>}
            <span className="socials"><Social className="rise" style={(i) => step(i + 3)} /></span>
            <span className="rise" style={step(7)}><CopyEmail email={EMAIL} /></span>
          </p>
        </header>

        <section className="row" id="now">
          <h2>Now</h2>
          <dl>
            {NOW.map((c) => (
              <div className="line" key={c.label}>
                <dt>{cap(c.label)}</dt>
                <dd>
                  {c.href ? <a href={c.href} {...ext}>{c.value}<Ext /></a> : c.value}
                </dd>
              </div>
            ))}
            <div className="line">
              <dt>Raid</dt>
              <dd><DestinyStatus initial={destiny} /></dd>
            </div>
          </dl>
        </section>

        <section className="row" id="education">
          <h2>Education</h2>
          <div className="entry">
            <p className="title"><span>University of Waterloo</span></p>
            <p className="sub">Math-Phys</p>
          </div>
        </section>

        <section className="row wide" id="projects">
          <h2>Projects</h2>
          {featured.length > 0 && (
            <div className="featured">
              {featured.map((p) => (
                <a className="card" href={`/projects/${p.slug}`} key={p.slug}>
                  <ProjectCover name={p.name} cover={p.cover} className="cover" />
                  <span className="card-body">
                    <span className="title"><span>{p.name}</span><span className="year">{p.year}</span></span>
                    <span className="sub">{cap(p.blurb)}</span>
                    {p.tags.length > 0 && <span className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</span>}
                  </span>
                </a>
              ))}
            </div>
          )}
          <ul className="plist">
            {projects.filter((p) => !p.featured).map((p) => (
              <li key={p.slug}>
                <a className="prow" href={`/projects/${p.slug}`}>
                  <span className="pname"><ScrambleText text={p.name} /></span>
                  <span className="ptags">{p.tags.join(" · ")}</span>
                  <span className="year">{p.year}</span>
                  <i className="chev" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="row" id="interests">
          <h2>Interests</h2>
          <div className="stack">
            {tabs.map((t) => {
              const { label, body, items } = interests[t];
              return (
                <details className="entry int" key={t}>
                  <summary>
                    <span className="dt"><ScrambleText text={label} /></span>
                    <span className="dd">{summary(t)}</span>
                    <i className="tog" aria-hidden="true" />
                  </summary>
                  <div className="more">
                    {body && <p>{body}</p>}
                    {items && items.length > 0 && (
                      <ul>
                        {items.map((it) => (
                          <li key={it.title}>
                            <strong>{it.title}</strong>
                            {it.note && <span>{it.note}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
