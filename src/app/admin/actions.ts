"use server";

import { revalidatePath } from "next/cache";
import { drawPairs } from "@/lib/draw";
import { requireAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function updateSettings(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const groupName = String(formData.get("group_name") ?? "").trim();
  const maxQuestions = Number(formData.get("max_questions"));
  if (!groupName) return { error: "The group needs a name." };
  if (!Number.isInteger(maxQuestions) || maxQuestions < 1 || maxQuestions > 50) {
    return { error: "Questions must be a whole number between 1 and 50." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      group_name: groupName,
      budget: String(formData.get("budget") ?? "").trim() || null,
      exchange_date: String(formData.get("exchange_date") ?? "") || null,
      max_questions: maxQuestions,
    })
    .eq("id", 1);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function addExclusion(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
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

  revalidatePath("/admin");
  return null;
}

export async function removeExclusion(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("exclusions")
    .delete()
    .eq("member_a", String(formData.get("a")))
    .eq("member_b", String(formData.get("b")));
  revalidatePath("/admin");
}

export async function runDraw(): Promise<FormState> {
  await requireAdmin();
  // The secret-key client lets the server write pairs that no browser (not even yours) sees.
  const admin = createAdminClient();
  const [members, exclusions] = await Promise.all([
    admin.from("members").select("id"),
    admin.from("exclusions").select("member_a, member_b"),
  ]);
  if (members.error) return { error: members.error.message };
  if (exclusions.error) return { error: exclusions.error.message };

  const result = drawPairs(
    members.data.map((m) => m.id),
    exclusions.data.map((e) => [e.member_a, e.member_b] as [string, string]),
  );
  if (!result.ok) return { error: result.error };

  const { error } = await admin.rpc("save_draw", {
    p_pairs: result.pairs.map((p) => ({ santa_id: p.santa, recipient_id: p.recipient })),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Names drawn! Everyone can now see who they're Santa for." };
}

export async function resetDraw(): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_draw");
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "The draw was reset." };
}
