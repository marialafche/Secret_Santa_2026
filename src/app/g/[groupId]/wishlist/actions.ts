"use server";

import { revalidatePath } from "next/cache";
import { getGroupContext } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

// Bound to a group id in the page: addItem.bind(null, groupId).
export async function addItem(
  groupId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { me } = await getGroupContext(groupId);
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

  revalidatePath(`/g/${groupId}/wishlist`);
  return null;
}

export async function deleteItem(groupId: string, formData: FormData) {
  await getGroupContext(groupId);
  const supabase = await createClient();
  // Row level security only lets people delete their own items.
  await supabase.from("wishlist_items").delete().eq("id", Number(formData.get("id")));
  revalidatePath(`/g/${groupId}/wishlist`);
}
