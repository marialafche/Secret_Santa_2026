import { headers } from "next/headers";
import { CopyButton } from "@/components/copy-button";
import { ActionForm, SubmitButton } from "@/components/form";
import { getMembers, getSettings, requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { addExclusion, removeExclusion, resetDraw, runDraw, updateSettings } from "./actions";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [settings, members, { data: exclusions }, h] = await Promise.all([
    getSettings(),
    getMembers(),
    supabase.from("exclusions").select("member_a, member_b"),
    headers(),
  ]);

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const inviteLink = `${protocol}://${host}/join?code=${settings.invite_code}`;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? "?";
  const drawn = settings.drawn_at !== null;

  return (
    <div className="space-y-6">
      <h1 className="text-4xl sm:text-5xl">Organizer</h1>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Invite link</h2>
        <p className="text-sm text-muted">
          {drawn
            ? "The draw has happened, so no one new can join."
            : "Send this to your friends. Anyone with the link can join."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={inviteLink} className="input font-mono text-sm" />
          <CopyButton text={inviteLink} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <ActionForm action={updateSettings} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="group_name" className="label">
              Group name
            </label>
            <input
              id="group_name"
              name="group_name"
              required
              maxLength={60}
              defaultValue={settings.group_name}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="budget" className="label">
              Budget
            </label>
            <input
              id="budget"
              name="budget"
              maxLength={40}
              placeholder="e.g. €30"
              defaultValue={settings.budget ?? ""}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="exchange_date" className="label">
              Gift exchange date
            </label>
            <input
              id="exchange_date"
              name="exchange_date"
              type="date"
              defaultValue={settings.exchange_date ?? ""}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="max_questions" className="label">
              Questions per Santa
            </label>
            <input
              id="max_questions"
              name="max_questions"
              type="number"
              min={1}
              max={50}
              required
              defaultValue={settings.max_questions}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Save settings</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Exclusions</h2>
          <p className="text-sm text-muted">
            Pairs who shouldn&apos;t draw each other (works both ways).
          </p>
        </div>

        {exclusions && exclusions.length > 0 ? (
          <ul className="divide-y divide-line">
            {exclusions.map((e) => (
              <li key={`${e.member_a}-${e.member_b}`} className="flex items-center gap-3 py-2">
                <span className="flex-1">
                  {nameOf(e.member_a)} ↔ {nameOf(e.member_b)}
                </span>
                {!drawn && (
                  <form action={removeExclusion}>
                    <input type="hidden" name="a" value={e.member_a} />
                    <input type="hidden" name="b" value={e.member_b} />
                    <button type="submit" className="text-sm text-muted hover:text-red-700">
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No exclusions.</p>
        )}

        {!drawn && (
          <ActionForm
            action={addExclusion}
            className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center"
          >
            <MemberSelect name="a" members={members} />
            <span className="text-center text-muted">↔</span>
            <MemberSelect name="b" members={members} />
            <SubmitButton variant="secondary">Add</SubmitButton>
          </ActionForm>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">The draw</h2>
        {drawn ? (
          <>
            <p>
              ✅ Names were drawn on{" "}
              {new Date(settings.drawn_at!).toLocaleDateString("en-GB", { dateStyle: "long" })}
              . Nobody, including you, can see the full list.
            </p>
            <ActionForm action={resetDraw} className="space-y-2">
              <SubmitButton
                variant="danger"
                confirm="Reset the draw? This deletes every match and all chat messages."
              >
                Reset draw
              </SubmitButton>
            </ActionForm>
          </>
        ) : (
          <>
            <p className="text-muted">
              {members.length} {members.length === 1 ? "person has" : "people have"} joined.
              Once everyone is in, draw the names. After that no one new can join.
            </p>
            <ActionForm action={runDraw} className="space-y-2">
              <SubmitButton confirm={`Draw names for ${members.length} people now?`}>
                🎲 Draw names
              </SubmitButton>
            </ActionForm>
          </>
        )}
      </section>
    </div>
  );
}

function MemberSelect({
  name,
  members,
}: {
  name: string;
  members: { id: string; display_name: string }[];
}) {
  return (
    <select name={name} required defaultValue="" className="input sm:flex-1">
      <option value="" disabled>
        Choose…
      </option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.display_name}
        </option>
      ))}
    </select>
  );
}
