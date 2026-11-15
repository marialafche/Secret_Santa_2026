import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { NavLink } from "@/components/nav-link";
import { getMember, getUser } from "@/lib/data";

const pages = [
  { href: "/", label: "🏠 Home" },
  { href: "/wishlist", label: "🎁 Wishlists" },
  { href: "/chat", label: "💬 Chat" },
];
const organizerPage = { href: "/admin", label: "⭐ Organizer" };

/** On wide screens the links sit next to the logo; on phones and tablets they get their own row below it. */
export async function SiteHeader() {
  const [user, member] = await Promise.all([getUser(), getMember()]);
  const links = member ? [...pages, ...(member.is_admin ? [organizerPage] : [])] : [];

  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center px-4 py-3 text-sm font-medium text-muted md:flex-nowrap md:py-4">
      <Link href="/" className="mr-auto whitespace-nowrap py-1 font-display text-lg font-bold text-foreground">
        🎅 Secret Santa
      </Link>

      {user && (
        <form action={signOut} className="md:order-last">
          <button type="submit" className="cursor-pointer whitespace-nowrap px-3 py-1.5 hover:text-foreground">
            Sign out
          </button>
        </form>
      )}

      {links.length > 0 && (
        <nav
          aria-label="Main"
          className="-mx-4 mt-2 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-0 md:w-auto md:overflow-visible md:px-0"
        >
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
