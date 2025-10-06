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
  const cookieStorePromise = cookies();
  const supabaseUrl = assertSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = assertSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      async get(name: string) {
        const cookieStore = await cookieStorePromise;
        return cookieStore.get(name)?.value;
      },
      async set(name: string, value: string, options: CookieOptions) {
        const cookieStore = await cookieStorePromise;
        cookieStore.set({ name, value, ...options });
      },
      async remove(name: string, options: CookieOptions) {
        const cookieStore = await cookieStorePromise;
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}
