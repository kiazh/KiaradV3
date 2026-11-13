"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Command } from "cmdk";
import { PATHS } from "./Social";

export type PaletteItem = { group: string; label: string; hint?: string; href?: string; copy?: string };

// 16px line icons, one stroke, drawn here so the palette needs no icon library.
const LINE: Record<string, string> = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  hash: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
  file: "M14 3H6v18h12V7l-4-4Zm0 0v4h4",
  doc: "M7 3h10v18H7zM10 8h4M10 12h4M10 16h2",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  out: "M7 17 17 7M9 7h8v8",
};
const Line = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"><path d={d} /></svg>
);
const Brand = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
);
const icon = (it: PaletteItem) =>
  PATHS[it.label] ? <Brand d={PATHS[it.label]} /> : <Line d={it.copy ? LINE.copy : it.group === "Projects" ? LINE.file : it.href?.startsWith("/") ? LINE.hash : LINE.doc} />;

const noop = () => () => {};

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Read on the client without an extra render; the server assumes Mac.
  const mac = useSyncExternalStore(noop, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const run = (it: PaletteItem) => {
    if (it.copy) {
      navigator.clipboard?.writeText(it.copy)
        .then(() => { setCopied(true); setTimeout(() => { setCopied(false); setOpen(false); }, 700); })
        .catch(() => setOpen(false)); // clipboard refused: close rather than pretend it worked
      return;
    }
    setOpen(false);
    if (!it.href) return;
    if (it.href.startsWith("/")) location.assign(it.href);
    else window.open(it.href, "_blank", "noopener,noreferrer");
  };

  const groups = [...new Set(items.map((i) => i.group))];
  const key = mac ? "⌘K" : "Ctrl K";

  return (
    <>
      <button type="button" className="ctl" onClick={() => setOpen(true)} aria-label={`Search (${key})`}>
        <span className="ctl-label">Search</span>
        <kbd>{key}</kbd>
      </button>
      <Command.Dialog open={open} onOpenChange={setOpen} label="Search" overlayClassName="pal-overlay" contentClassName="pal" loop>
        <div className="pal-input">
          <Line d={LINE.search} />
          <Command.Input placeholder="Search" />
          <kbd aria-hidden="true">Esc</kbd>
        </div>
        <Command.List>
          <Command.Empty>Nothing matches</Command.Empty>
          {groups.map((g) => (
            <Command.Group heading={g} key={g}>
              {items.filter((i) => i.group === g).map((it) => (
                <Command.Item key={it.group + it.label} value={`${it.group} ${it.label} ${it.hint ?? ""}`} onSelect={() => run(it)}>
                  <span className="pal-ico">{icon(it)}</span>
                  <span className="pal-label">{it.copy && copied ? "Copied" : it.label}</span>
                  {it.hint && <span className="hint">{it.hint}</span>}
                  {it.href && !it.href.startsWith("/") && <span className="pal-out"><Line d={LINE.out} /></span>}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="pal-foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> Move</span>
          <span><kbd>↵</kbd> Open</span>
        </div>
      </Command.Dialog>
    </>
  );
}
