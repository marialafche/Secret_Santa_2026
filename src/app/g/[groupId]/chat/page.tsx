import { getGroupContext, getMyRecipient } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";
import { ChatThread } from "./chat-thread";

export default async function ChatPage({ params }: PageProps<"/g/[groupId]/chat">) {
  const { groupId } = await params;
  const [{ me, group }, recipient] = await Promise.all([
    getGroupContext(groupId),
    getMyRecipient(groupId),
  ]);

  if (!recipient) {
    return (
      <div className="card space-y-2">
        <h1 className="text-2xl font-semibold">Anonymous chat</h1>
        <p className="text-muted">The chat opens once the organizer has drawn names.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, recipient_id, question_number, question_id, body, created_at")
    .in("recipient_id", [recipient.id, me.id])
    .order("id");
  const messages = (data ?? []) as Message[];

  return (
    <div className="space-y-6">
      <h1 className="text-4xl sm:text-5xl">Anonymous chat</h1>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Ask {recipient.display_name}</h2>
          <p className="text-sm text-muted">
            They&apos;ll see your questions as coming from &ldquo;Your Santa&rdquo;.
          </p>
        </div>
        <ChatThread
          mode="santa"
          groupId={groupId}
          threadId={recipient.id}
          initialMessages={messages.filter((m) => m.recipient_id === recipient.id)}
          maxQuestions={group.max_questions}
        />
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Questions from your Santa</h2>
          <p className="text-sm text-muted">Someone is shopping for you. Answer away!</p>
        </div>
        <ChatThread
          mode="recipient"
          groupId={groupId}
          threadId={me.id}
          initialMessages={messages.filter((m) => m.recipient_id === me.id)}
          maxQuestions={group.max_questions}
        />
      </section>
    </div>
  );
}
