import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

function assertSupabaseEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    assertSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    assertSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
