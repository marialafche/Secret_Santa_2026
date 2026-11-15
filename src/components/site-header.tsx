import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { NavLink } from "@/components/nav-link";
import { getMember, getUser } from "@/lib/data";

const pages = [
  { href: "/", icon: "рџЏ ", label: "Home" },
  { href: "/wishlist", icon: "рџЋЃ", label: "Wishlists" },
  { href: "/chat", icon: "рџ’¬", label: "Chat" },
];
const organizerPage = { href: "/admin", icon: "в­ђ", label: "Organizer" };

/** On wide screens the links sit next to the logo; on phones and tablets they get their own row below it. */
export async function SiteHeader() {
  const [user, member] = await Promise.all([getUser(), getMember()]);
  const links = member ? [...pages, ...(member.is_admin ? [organizerPage] : [])] : [];

  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center px-4 py-3 text-sm font-medium text-muted md:flex-nowrap md:py-4">
      <Link href="/" className="mr-auto whitespace-nowrap py-1 font-display text-lg font-bold text-foreground">
        рџЋ… Secret Santa Utaiki
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
          className="mt-2 flex w-full gap-1 md:mt-0 md:w-auto"
        >
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} icon={l.icon} label={l.label} />
          ))}
        </nav>
      )}
    </header>
  );
}
