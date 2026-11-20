"use server";

import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) return { error: "Your new password must be at least 6 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That's already your password. Pick a different one."
          : error.message,
    };
  }
  return { message: "Password changed! Use the new one next time you sign in. 🎉" };
}
