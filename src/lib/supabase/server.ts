import { cookies } from "next/headers";
import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import type { Database } from "@/types/database";

function assertSupabaseEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const supabaseUrl = assertSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = assertSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        if (typeof cookieStore.set === "function") {
          cookieStore.set({ name, value, ...options });
        }
      },
      remove(name: string, options: CookieOptions) {
        if (typeof cookieStore.set === "function") {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        }
      },
    },
  });
}
