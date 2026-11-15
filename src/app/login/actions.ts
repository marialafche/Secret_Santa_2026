"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function authenticate(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";

  if (!email) return { error: "Please enter your email." };
  if (password.length < 6) return { error: "Your password must be at least 6 characters." };

  const supabase = await createClient();
  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // Only happens if "Confirm email" is still switched on in Supabase.
    if (!data.session) return { message: "Check your email to confirm your account, then sign in." };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Wrong email or password." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
