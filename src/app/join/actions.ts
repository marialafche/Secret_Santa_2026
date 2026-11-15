"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function joinGroup(_state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group", {
    p_code: String(formData.get("code") ?? ""),
    p_name: String(formData.get("name") ?? ""),
  });
  if (error) return { error: error.message };
  // Re-render the layout too, so the header shows the menu for the new member.
  revalidatePath("/", "layout");
  redirect("/");
}
