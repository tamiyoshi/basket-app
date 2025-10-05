"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out", error);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/login");
}
