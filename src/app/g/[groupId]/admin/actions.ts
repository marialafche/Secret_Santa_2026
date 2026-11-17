"use server";

import { revalidatePath } from "next/cache";
import { drawPairs } from "@/lib/draw";
import { requireGroupAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

// Each action is bound to a group id in the page, e.g. runDraw.bind(null, groupId).

export async function updateSettings(
  groupId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireGroupAdmin(groupId);
  const name = String(formData.get("name") ?? "").trim();
  const maxQuestions = Number(formData.get("max_questions"));
  if (!name) return { error: "The group needs a name." };
  if (!Number.isInteger(maxQuestions) || maxQuestions < 1 || maxQuestions > 50) {
    return { error: "Questions must be a whole number between 1 and 50." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({
      name,
      budget: String(formData.get("budget") ?? "").trim() || null,
      exchange_date: String(formData.get("exchange_date") ?? "") || null,
      max_questions: maxQuestions,
    })
    .eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function addExclusion(
  groupId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireGroupAdmin(groupId);
  const a = String(formData.get("a") ?? "");
  const b = String(formData.get("b") ?? "");
  if (!a || !b) return { error: "Pick two people." };
  if (a === b) return { error: "Pick two different people." };

  const [memberA, memberB] = [a, b].sort();
  const supabase = await createClient();
  const { error } = await supabase
    .from("exclusions")
    .insert({ member_a: memberA, member_b: memberB });
  if (error) {
    return { error: error.code === "23505" ? "That pair is already excluded." : error.message };
  }

  revalidatePath(`/g/${groupId}/admin`);
  return null;
}

export async function removeExclusion(groupId: string, formData: FormData) {
  await requireGroupAdmin(groupId);
  const supabase = await createClient();
  await supabase
    .from("exclusions")
    .delete()
    .eq("member_a", String(formData.get("a")))
    .eq("member_b", String(formData.get("b")));
  revalidatePath(`/g/${groupId}/admin`);
}

export async function runDraw(groupId: string): Promise<FormState> {
  await requireGroupAdmin(groupId);
  // The secret-key client lets the server write pairs that no browser (not even yours) sees.
  const admin = createAdminClient();
  const members = await admin.from("members").select("id").eq("group_id", groupId);
  if (members.error) return { error: members.error.message };
  const ids = members.data.map((m) => m.id);

  const exclusions = await admin
    .from("exclusions")
    .select("member_a, member_b")
    .in("member_a", ids);
  if (exclusions.error) return { error: exclusions.error.message };

  const result = drawPairs(
    ids,
    exclusions.data.map((e) => [e.member_a, e.member_b] as [string, string]),
  );
  if (!result.ok) return { error: result.error };

  const { error } = await admin.rpc("save_draw", {
    p_group_id: groupId,
    p_pairs: result.pairs.map((p) => ({ santa_id: p.santa, recipient_id: p.recipient })),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Names drawn! Everyone can now see who they're Santa for." };
}

export async function resetDraw(groupId: string): Promise<FormState> {
  await requireGroupAdmin(groupId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_draw", { p_group_id: groupId });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "The draw was reset." };
}
