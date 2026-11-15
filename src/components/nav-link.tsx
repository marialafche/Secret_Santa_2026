"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Menu link that's highlighted while you're on its page (or a page below it). */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition hover:text-foreground ${
        active ? "bg-tint text-foreground" : ""
      }`}
    >
      {children}
    </Link>
  );
}
