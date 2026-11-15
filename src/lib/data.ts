import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Member, Settings } from "@/lib/types";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** The signed-in user's membership, or null if they haven't joined the group. */
export const getMember = cache(async (): Promise<Member | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, display_name, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

export async function requireMember(): Promise<Member> {
  const user = await getUser();
  if (!user) redirect("/login");
  const member = await getMember();
  if (!member) redirect("/join");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (!member.is_admin) redirect("/");
  return member;
}

export const getSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("group_name, budget, exchange_date, max_questions, invite_code, drawn_at")
    .single();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data;
});

export const getMembers = cache(async (): Promise<Member[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, display_name, is_admin")
    .order("joined_at");
  if (error) throw new Error(`Could not load members: ${error.message}`);
  return data;
});

/** Who the signed-in user is Santa for, or null before the draw. */
export const getMyRecipient = cache(async (): Promise<Member | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("assignments").select("recipient_id").maybeSingle();
  if (!data) return null;
  const members = await getMembers();
  return members.find((m) => m.id === data.recipient_id) ?? null;
});

export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysUntil(date: string) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - todayUtc) / 86_400_000);
}

/** Only allow redirects to paths on this site. */
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
