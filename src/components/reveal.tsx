"use client";

import { useState } from "react";

/** Hides the recipient's name until clicked, so nobody sees it over your shoulder. */
export function Reveal({ name }: { name: string }) {
  const [shown, setShown] = useState(false);
  return shown ? (
    <button type="button" onClick={() => setShown(false)} className="text-left">
      <span className="text-sm text-muted">You are Secret Santa for</span>
      <span className="block font-display text-4xl font-bold text-accent">{name}</span>
      <span className="text-xs text-muted">Tap to hide</span>
    </button>
  ) : (
    <button type="button" onClick={() => setShown(true)} className="btn btn-primary">
      🎁 Reveal who you&apos;re Santa for
    </button>
  );
}
