"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function joinGroup(_state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("join_group", {
    p_code: String(formData.get("code") ?? ""),
    p_name: String(formData.get("name") ?? ""),
  });
  if (error) return { error: error.message };
  // Re-render the layout too, so the header shows the new group.
  revalidatePath("/", "layout");
  redirect(`/g/${groupId}`);
}

/** Accepts a pasted invite link or a bare code and opens the join page for it. */
export async function goToInvite(_state: FormState, formData: FormData): Promise<FormState> {
  const input = String(formData.get("code") ?? "").trim();
  const code = input.match(/[?&]code=([^&#\s]+)/)?.[1] ?? input;
  if (!/^[\w-]{4,64}$/.test(code)) return { error: "That doesn't look like an invite code." };
  redirect(`/join?code=${encodeURIComponent(code)}`);
}
