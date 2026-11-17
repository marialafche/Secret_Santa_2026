import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { getMyGroups, getUser } from "@/lib/data";

/** Logo and account links. Each group's own menu lives in the group layout. */
export async function SiteHeader() {
  const user = await getUser();
  const groupCount = user ? (await getMyGroups()).length : 0;

  return (
    <header className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 py-3 text-sm font-medium text-muted md:py-4">
      <Link href="/" className="mr-auto whitespace-nowrap py-1 font-display text-lg font-bold text-foreground">
        🎅 Secret Santa
      </Link>
      {groupCount > 1 && (
        <Link href="/" className="whitespace-nowrap px-3 py-1.5 hover:text-foreground">
          My groups
        </Link>
      )}
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
