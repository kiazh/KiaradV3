"use client";

import { useRef, useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = () => {
    setDone(true); // optimistic: confirm instantly, undo only if the clipboard refuses
    navigator.clipboard?.writeText(email).catch(() => setDone(false));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1500);
  };

  return (
    <button type="button" className="copy" data-done={done} onClick={copy} aria-live="polite">
      <span className="copy-a">Copy email</span>
      <span className="copy-b" aria-hidden={!done}>Copied</span>
    </button>
  );
}
