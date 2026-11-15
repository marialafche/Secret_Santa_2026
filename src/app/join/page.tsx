import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/form";
import { Hero } from "@/components/hero";
import { getMember, getUser } from "@/lib/data";
import { joinGroup } from "./actions";

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const { code } = await searchParams;
  const inviteCode = typeof code === "string" ? code : "";

  if (!(await getUser())) {
    const here = inviteCode ? `/join?code=${encodeURIComponent(inviteCode)}` : "/join";
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }
  if (await getMember()) redirect("/");

  return (
    <div className="mx-auto max-w-lg py-4 sm:py-10">
      <Hero badge="Secret Santa · almost there" title="One last thing:" highlight="who are you?">
        Pick the name everyone will see. Your Santa will be shopping for this person! 🎅
      </Hero>

      <div className="card">
        <ActionForm action={joinGroup} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Your name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={40}
              placeholder="e.g. Maria"
              className="input"
            />
          </div>
          {inviteCode ? (
            <input type="hidden" name="code" value={inviteCode} />
          ) : (
            <div>
              <label htmlFor="code" className="label">
                Invite code
              </label>
              <input id="code" name="code" required className="input" />
              <p className="mt-1.5 text-xs text-muted">Ask the organizer for the invite link.</p>
            </div>
          )}
          <div className="[&>button]:w-full [&>button]:py-3.5 [&>button]:text-base">
            <SubmitButton>Join the fun 🎄</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
