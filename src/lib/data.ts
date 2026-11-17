import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Group, Member, MyGroup } from "@/lib/types";

const GROUP_COLUMNS = "id, name, budget, exchange_date, max_questions, invite_code, drawn_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The signed-in user, or null. Uses getClaims, which verifies the login token
 * locally (the project uses asymmetric signing keys) instead of asking Supabase.
 */
export const getUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ? { id: data.claims.sub } : null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Whether the signed-in user may create groups. */
export const isOwner = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_owners")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
});

/** Every group the signed-in user belongs to, with their membership in it. */
export const getMyGroups = cache(async (): Promise<MyGroup[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(`id, display_name, is_admin, group:groups (${GROUP_COLUMNS})`)
    .eq("user_id", user.id)
    .order("joined_at");
  if (error) throw new Error(`Could not load your groups: ${error.message}`);
  return (data as unknown as (Member & { group: Group })[]).map(({ group, ...me }) => ({
    group,
    me,
  }));
});

/**
 * The group and the signed-in user's membership in it. Shows "not found" if the
 * group doesn't exist or the user isn't in it.
 */
export const getGroupContext = cache(async (groupId: string): Promise<MyGroup> => {
  if (!UUID.test(groupId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: me }, { data: group }] = await Promise.all([
    supabase
      .from("members")
      .select("id, display_name, is_admin")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("groups").select(GROUP_COLUMNS).eq("id", groupId).maybeSingle(),
  ]);
  if (!me || !group) notFound();
  return { me, group };
});

export async function requireGroupAdmin(groupId: string): Promise<MyGroup> {
  const context = await getGroupContext(groupId);
  if (!context.me.is_admin) redirect(`/g/${groupId}`);
  return context;
}

export const getMembers = cache(async (groupId: string): Promise<Member[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, display_name, is_admin")
    .eq("group_id", groupId)
    .order("joined_at");
  if (error) throw new Error(`Could not load members: ${error.message}`);
  return data;
});

/** Who the signed-in user is Santa for in this group, or null before the draw. */
export const getMyRecipient = cache(async (groupId: string): Promise<Member | null> => {
  const { me } = await getGroupContext(groupId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("recipient_id")
    .eq("santa_id", me.id)
    .maybeSingle();
  if (!data) return null;
  const members = await getMembers(groupId);
  return members.find((m) => m.id === data.recipient_id) ?? null;
});

/** The full join link for an invite code, on whatever address the app is served from. */
export async function inviteLinkFor(code: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}/join?code=${code}`;
}

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
