import type { CSSProperties } from "react";

const FLAKE_COUNT = 70;

// Deterministic pseudo-random numbers, so the server and browser render identical flakes.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const random = seeded(2025);
const flakes = Array.from({ length: FLAKE_COUNT }, () => {
  const duration = 9 + random() * 14;
  return {
    "--x": `${random() * 100}%`,
    "--y": `${random() * 100}vh`,
    "--size": `${2 + random() * 4}px`,
    "--opacity": (0.35 + random() * 0.55).toFixed(2),
    "--duration": `${duration.toFixed(1)}s`,
    // Negative delay starts each flake mid-fall, so the sky is full right away.
    "--delay": `${(-random() * duration).toFixed(1)}s`,
    "--drift": `${(random() * 60 - 30).toFixed(0)}px`,
  } as CSSProperties;
});

/** Red gradient background with gently falling snow. Purely decorative. */
export function Snow() {
  return (
    <div className="backdrop" aria-hidden="true">
      {flakes.map((style, i) => (
        <span key={i} className="flake" style={style} />
      ))}
    </div>
  );
}
