"use server";

import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function createGroup(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await isOwner())) return { error: "Only the app owner can create groups." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", {
    p_name: String(formData.get("name") ?? ""),
  });
  if (error) return { error: error.message };

  revalidatePath("/owner");
  return { message: "Group created! Copy its invite link below." };
}
