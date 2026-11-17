import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/form";
import { getMyGroups, isOwner, requireUser } from "@/lib/data";
import { goToInvite } from "./join/actions";

export default async function MyGroupsPage() {
  await requireUser();
  const [groups, owner] = await Promise.all([getMyGroups(), isOwner()]);

  // Most people are in a single group: take them straight there.
  if (groups.length === 1 && !owner) redirect(`/g/${groups[0].group.id}`);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl sm:text-5xl">Your groups</h1>

      {owner && (
        <Link href="/owner" className="card block transition hover:-translate-y-0.5">
          <p className="font-semibold">⭐ All groups</p>
          <p className="text-sm text-muted">Create new groups and get their invite links.</p>
        </Link>
      )}

      {groups.length > 0 ? (
        <ul className="space-y-3">
          {groups.map(({ group, me }) => (
            <li key={group.id}>
              <Link
                href={`/g/${group.id}`}
                className="card flex items-center gap-4 transition hover:-translate-y-0.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold break-words">{group.name}</p>
                  <p className="text-sm text-muted">
                    You&apos;re {me.display_name}
                    {me.is_admin && " · organizer"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-tint px-3 py-1 text-xs font-semibold">
                  {group.drawn_at ? "🎁 Names drawn" : "⏳ Waiting"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold">You&apos;re not in a group yet</h2>
          <p className="text-muted">
            Open the invite link your organizer sent you, or paste the code from it below.
          </p>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Join another group</h2>
        <ActionForm action={goToInvite} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="code"
            required
            placeholder="Invite link or code"
            aria-label="Invite link or code"
            className="input"
          />
          <SubmitButton>Join</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
