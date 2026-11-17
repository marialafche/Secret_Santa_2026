import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { ActionForm, SubmitButton } from "@/components/form";
import { getMyGroups, inviteLinkFor, isOwner } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Group } from "@/lib/types";
import { createGroup } from "./actions";

type GroupOverview = Group & {
  members: { display_name: string; is_admin: boolean }[];
};

/** The app owner's overview: create groups and hand out their invite links. */
export default async function OwnerPage() {
  if (!(await isOwner())) redirect("/");

  const supabase = await createClient();
  const [{ data, error }, myGroups] = await Promise.all([
    supabase
      .from("groups")
      .select(
        "id, name, budget, exchange_date, max_questions, invite_code, drawn_at, members (display_name, is_admin)",
      )
      .order("created_at", { ascending: false }),
    getMyGroups(),
  ]);
  if (error) throw new Error(`Could not load groups: ${error.message}`);
  const groups = data as GroupOverview[];
  const mine = new Set(myGroups.map((g) => g.group.id));
  const links = await Promise.all(groups.map((g) => inviteLinkFor(g.invite_code)));

  return (
    <div className="space-y-6">
      <h1 className="text-4xl sm:text-5xl">All groups</h1>

      <section className="card space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Create a group</h2>
          <p className="text-sm text-muted">
            Send its invite link to whoever will run it. The first person to join becomes the
            group&apos;s organizer.
          </p>
        </div>
        <ActionForm action={createGroup} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="name"
            required
            maxLength={60}
            placeholder="e.g. Family Christmas 2026"
            aria-label="Group name"
            className="input"
          />
          <SubmitButton>Create</SubmitButton>
        </ActionForm>
      </section>

      <ul className="space-y-4">
        {groups.map((group, i) => {
          const organizers = group.members.filter((m) => m.is_admin).map((m) => m.display_name);
          return (
            <li key={group.id} className="card space-y-3">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <h2 className="mr-auto font-display text-xl font-bold break-words">{group.name}</h2>
                <span className="shrink-0 rounded-full bg-tint px-3 py-1 text-xs font-semibold">
                  {group.drawn_at ? "🎁 Names drawn" : "⏳ Waiting"}
                </span>
              </div>
              <p className="text-sm text-muted">
                {group.members.length} {group.members.length === 1 ? "member" : "members"}
                {organizers.length > 0
                  ? ` · organized by ${organizers.join(", ")}`
                  : " · no one has joined yet"}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={links[i]}
                  aria-label={`Invite link for ${group.name}`}
                  className="input font-mono text-sm"
                />
                <CopyButton text={links[i]} />
              </div>
              {mine.has(group.id) && (
                <Link href={`/g/${group.id}`} className="link text-sm">
                  Open group →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
