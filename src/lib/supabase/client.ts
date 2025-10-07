import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase クライアント初期化用の環境変数が設定されていません");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
