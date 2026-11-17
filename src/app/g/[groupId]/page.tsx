import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { daysUntil, formatDate, getGroupContext, getMembers, getMyRecipient } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";

export default async function GroupHome({ params }: PageProps<"/g/[groupId]">) {
  const { groupId } = await params;
  const { me, group } = await getGroupContext(groupId);
  const [members, recipient] = await Promise.all([getMembers(groupId), getMyRecipient(groupId)]);
  const base = `/g/${groupId}`;

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-muted">Hi {me.display_name} 👋</p>
        <h1 className="text-4xl sm:text-5xl">{group.name}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          {group.budget && <span>💰 Budget: {group.budget}</span>}
          {group.exchange_date && (
            <span>
              📅 {formatDate(group.exchange_date)}
              <DaysLeft date={group.exchange_date} />
            </span>
          )}
        </div>
      </section>

      {recipient ? (
        <AfterDraw
          base={base}
          recipientId={recipient.id}
          recipientName={recipient.display_name}
          myId={me.id}
          maxQuestions={group.max_questions}
        />
      ) : (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Waiting for the draw ⏳</h2>
          <p className="text-muted">
            Once everyone has joined, the organizer will draw names. Meanwhile, write your wishlist
            so your Santa knows what you&apos;d like.
          </p>
          <Link href={`${base}/wishlist`} className="btn btn-primary">
            Write my wishlist
          </Link>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Who&apos;s in ({members.length})</h2>
        <ul className="flex flex-wrap gap-2">
          {members.map((m) => (
            <li key={m.id} className="rounded-full border border-line px-3 py-1 text-sm">
              {m.display_name}
              {m.is_admin && <span className="text-muted"> · organizer</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DaysLeft({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days < 0) return null;
  return <> · {days === 0 ? "today!" : `${days} day${days === 1 ? "" : "s"} to go`}</>;
}

async function AfterDraw({
  base,
  recipientId,
  recipientName,
  myId,
  maxQuestions,
}: {
  base: string;
  recipientId: string;
  recipientName: string;
  myId: string;
  maxQuestions: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, recipient_id, question_id")
    .in("recipient_id", [recipientId, myId]);
  const messages = (data ?? []) as Pick<Message, "id" | "recipient_id" | "question_id">[];

  const questionsAsked = messages.filter(
    (m) => m.recipient_id === recipientId && m.question_id === null,
  ).length;
  const answered = new Set(messages.map((m) => m.question_id));
  const unanswered = messages.filter(
    (m) => m.recipient_id === myId && m.question_id === null && !answered.has(m.id),
  ).length;

  return (
    <>
      <section className="card space-y-4">
        <Reveal name={recipientName} />
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/wishlist/recipient`} className="btn btn-secondary">
            See their wishlist
          </Link>
          <Link href={`${base}/chat`} className="btn btn-secondary">
            Ask them a question ({maxQuestions - questionsAsked} left)
          </Link>
        </div>
      </section>

      {unanswered > 0 && (
        <Link href={`${base}/chat`} className="card block ring-2 ring-accent transition hover:-translate-y-0.5">
          <p className="font-semibold">
            🎅 Your Santa asked you {unanswered} question{unanswered === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-muted">Tap to answer</p>
        </Link>
      )}
    </>
  );
}
