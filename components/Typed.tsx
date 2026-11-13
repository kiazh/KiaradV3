"use client";

import { useEffect, useState } from "react";

// Ported from the original site's Intro tagline. Starts after the name's scramble-in has had a moment to read.
const TIMING = {
  normal: { delay: 820, perChar: 45 },
  reduced: { delay: 200, perChar: 22 },
};

// U+200B keeps a full-height line box at zero characters, so the first character doesn't shove the page down.
const ZWSP = "\u200B";

export function Typed({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sleep = (ms: number) => new Promise<void>((r) => { timer = setTimeout(r, ms); });

    (async () => {
      const t = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? TIMING.reduced : TIMING.normal;
      await sleep(t.delay);
      if (cancelled) return;
      setTyping(true);
      for (let i = 1; i <= text.length; i++) {
        setCount(i);
        await sleep(t.perChar);
        if (cancelled) return;
      }
      setTyping(false);
    })();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" style={{ whiteSpace: "pre" }}>{ZWSP}{text.slice(0, count)}</span>
      <span aria-hidden="true" className={`caret${typing ? " caret-solid" : count === 0 ? " caret-hidden" : ""}`} />
    </>
  );
}
