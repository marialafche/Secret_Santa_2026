"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function useIsActive(href: string) {
  const pathname = usePathname();
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Top-menu link (computers) that's highlighted while you're on its page. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = useIsActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1 transition hover:text-foreground ${
        active ? "bg-tint text-foreground" : ""
      }`}
    >
      {children}
    </Link>
  );
}

/** Bottom tab bar link (phones): icon above a small label. */
export function TabLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const active = useIsActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition ${
        active ? "bg-tint text-accent" : "text-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`text-xl leading-none transition ${active ? "scale-110" : "opacity-80"}`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
