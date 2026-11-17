"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Menu link that's highlighted while you're on its page (or, unless `exact`, a page below it).
 * On phones the links share the row equally with the icon above the label.
 */
export function NavLink({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 whitespace-nowrap rounded-2xl px-1 py-1.5 text-xs transition hover:text-foreground md:flex-none md:flex-row md:gap-1.5 md:rounded-full md:px-3 md:text-sm ${
        active ? "bg-tint text-foreground" : ""
      }`}
    >
      <span aria-hidden="true" className="text-lg leading-none md:text-sm">
        {icon}
      </span>
      {label}
    </Link>
  );
}
