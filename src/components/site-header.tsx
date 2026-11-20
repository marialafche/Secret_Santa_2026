import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { getMyGroups, getUser, isOwner } from "@/lib/data";

/** Logo and account links. Each group's own menu lives in the group layout. */
export async function SiteHeader() {
  const user = await getUser();
  const [groupCount, owner] = user
    ? await Promise.all([getMyGroups().then((g) => g.length), isOwner()])
    : [0, false];

  return (
    <header className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 py-3 text-sm font-medium text-muted md:py-4">
      <Link href="/" className="mr-auto whitespace-nowrap py-1 font-display text-lg font-bold text-foreground">
        🎅 Secret Santa
      </Link>
      {groupCount > 1 && <HeaderLink href="/" icon="🎄" label="My groups" />}
      {owner && <HeaderLink href="/owner" icon="⭐" label="All groups" />}
      {user && <HeaderLink href="/account" icon="🔑" label="Password" />}
      {user && (
        <form action={signOut}>
          <button type="submit" className="cursor-pointer whitespace-nowrap px-3 py-1.5 hover:text-foreground">
            Sign out
          </button>
        </form>
      )}
    </header>
  );
}

/** On phones only the icon shows, so the bar fits next to the logo. */
function HeaderLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 hover:bg-tint hover:text-foreground sm:px-3"
    >
      <span aria-hidden="true" className="text-base leading-none sm:text-sm">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
