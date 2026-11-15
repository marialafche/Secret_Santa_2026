"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function addItem(_state: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!title) return { error: "Give your wish a name." };
  if (url && !/^https?:\/\//i.test(url)) {
    return { error: "Links must start with http:// or https://" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").insert({
    member_id: me.id,
    title,
    url: url || null,
    note: note || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/wishlist");
  return null;
}

export async function deleteItem(formData: FormData) {
  await requireMember();
  const supabase = await createClient();
  // Row level security only lets people delete their own items.
  await supabase.from("wishlist_items").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/wishlist");
}
