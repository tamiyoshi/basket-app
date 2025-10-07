import { cookies } from "next/headers";
import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import type { Database } from "@/types/database";

export function createSupabaseServerClient() {
  const cookieStorePromise = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase クライアント初期化用の環境変数が設定されていません");
  }

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
