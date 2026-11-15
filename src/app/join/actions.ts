"use server";

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
  redirect("/");
}
