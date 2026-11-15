import type { ReactNode } from "react";

/** Big festive heading for the login and join pages. */
export function Hero({
  badge,
  title,
  highlight,
  children,
}: {
  badge: string;
  title: string;
  /** Shown after the title in gold italics. */
  highlight: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-8 space-y-4">
      <span className="badge">{badge}</span>
      <h1 className="text-5xl leading-[1.05] sm:text-6xl">
        {title} <em className="text-accent">{highlight}</em>
      </h1>
      <p className="text-lg text-muted">{children}</p>
    </div>
  );
}
