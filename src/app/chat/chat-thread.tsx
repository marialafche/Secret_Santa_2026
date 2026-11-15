"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

type Props = {
  /** "santa": I ask my recipient. "recipient": I answer my Santa. */
  mode: "santa" | "recipient";
  /** The recipient's member id; each recipient has exactly one thread. */
  threadId: string;
  initialMessages: Message[];
  maxQuestions: number;
};

export function ChatThread({ mode, threadId, initialMessages, maxQuestions }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }, []);

  // Live updates: new questions and answers appear without reloading.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${mode}:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${threadId}`,
        },
        (payload) => addMessage(payload.new as Message),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mode, threadId, addMessage]);

  const questions = messages
    .filter((m) => m.question_id === null)
    .sort((a, b) => a.question_number! - b.question_number!);
  const answersFor = (questionId: number) =>
    messages.filter((m) => m.question_id === questionId).sort((a, b) => a.id - b.id);
  const left = maxQuestions - questions.length;

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <p className="text-muted">
          {mode === "santa"
            ? `No questions yet. You can ask up to ${maxQuestions}. They won't know it's you!`
            : "Your Santa hasn't asked anything yet."}
        </p>
      )}

      <ol className="space-y-4">
        {questions.map((q) => (
          <li key={q.id} className="space-y-2">
            <div className="rounded-2xl rounded-tl-sm bg-tint p-3">
              <p className="text-xs font-medium text-muted">
                {mode === "santa" ? "You asked" : "🎅 Your Santa asked"} · Question{" "}
                {q.question_number}/{maxQuestions}
              </p>
              <p className="whitespace-pre-wrap break-words">{q.body}</p>
            </div>
            {answersFor(q.id).map((a) => (
              <div key={a.id} className="ml-6 rounded-2xl rounded-tr-sm border border-line bg-surface p-3">
                <p className="text-xs font-medium text-muted">
                  {mode === "santa" ? "They answered" : "You answered"}
                </p>
                <p className="whitespace-pre-wrap break-words">{a.body}</p>
              </div>
            ))}
            {mode === "recipient" && (
              <div className="ml-6">
                <Composer
                  placeholder="Write an answer…"
                  button="Answer"
                  onSend={async (body) => {
                    const { data, error } = await supabase.rpc("answer_question", {
                      p_question_id: q.id,
                      p_body: body,
                    });
                    if (data) addMessage(data as Message);
                    return error?.message;
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      {mode === "santa" &&
        (left > 0 ? (
          <div className="border-t border-line pt-4">
            <Composer
              placeholder="Ask something…"
              button={`Ask (${left} left)`}
              onSend={async (body) => {
                const { data, error } = await supabase.rpc("ask_question", { p_body: body });
                if (data) addMessage(data as Message);
                return error?.message;
              }}
            />
          </div>
        ) : (
          <p className="border-t border-line pt-4 text-sm text-muted">
            You&apos;ve used all {maxQuestions} questions. Good luck with the gift!
          </p>
        ))}
    </div>
  );
}

function Composer({
  placeholder,
  button,
  onSend,
}: {
  placeholder: string;
  button: string;
  /** Returns an error message on failure. */
  onSend: (body: string) => Promise<string | undefined>;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const err = await onSend(body);
    setSending(false);
    setError(err);
    if (!err) setBody("");
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={1000}
        rows={2}
        className="input resize-y"
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={sending || !body.trim()} className="btn btn-primary">
        {sending ? "Sending…" : button}
      </button>
    </form>
  );
}
