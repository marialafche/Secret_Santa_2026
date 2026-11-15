import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { NavLink, TabLink } from "@/components/nav-link";
import { getMember, getUser } from "@/lib/data";

const pages = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/wishlist", label: "Wishlists", icon: "🎁" },
  { href: "/chat", label: "Chat", icon: "💬" },
];
const organizerPage = { href: "/admin", label: "Organizer", icon: "⭐" };

/** Top menu on computers; on phones the page links move to a bottom tab bar. */
export async function SiteHeader() {
  const [user, member] = await Promise.all([getUser(), getMember()]);
  const links = member ? [...pages, ...(member.is_admin ? [organizerPage] : [])] : [];

  return (
    <>
      <header>
        <nav className="mx-auto flex w-full max-w-3xl items-center gap-x-1 px-4 py-4 text-sm font-medium text-muted">
          <Link href="/" className="mr-auto font-display text-lg font-bold text-foreground">
            🎅 Secret Santa
          </Link>
          <div className="hidden items-center gap-x-1 sm:flex">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </div>
          {user && (
            <form action={signOut}>
              <button type="submit" className="cursor-pointer px-3 py-1 hover:text-foreground">
                Sign out
              </button>
            </form>
          )}
        </nav>
      </header>

      {links.length > 0 && (
        <nav
          aria-label="Main"
          className="tabbar fixed inset-x-0 bottom-0 z-20 flex gap-1 px-3 pt-2 sm:hidden"
        >
          {links.map((l) => (
            <TabLink key={l.href} href={l.href} icon={l.icon} label={l.label} />
          ))}
        </nav>
      )}
    </>
  );
}
