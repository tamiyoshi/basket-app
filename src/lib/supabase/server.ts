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
        const mutableCookies = cookieStore as unknown as {
          set?: (options: { name: string; value: string } & CookieOptions) => void;
        };
        if (typeof mutableCookies.set !== "function") {
          if (process.env.NODE_ENV === "development") {
            console.warn("Supabase cookie set skipped: not in a mutable cookies context");
          }
          return;
        }
        try {
          mutableCookies.set({ name, value, ...options });
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("Supabase cookie set failed:", error);
          }
        }
      },
      async remove(name: string, options: CookieOptions) {
        const cookieStore = await cookieStorePromise;
        const mutableCookies = cookieStore as unknown as {
          delete?: (name: string, options?: CookieOptions) => void;
          set?: (options: { name: string; value: string } & CookieOptions) => void;
        };
        if (typeof mutableCookies.delete === "function") {
          try {
            mutableCookies.delete(name, options);
            return;
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              console.warn("Supabase cookie delete failed:", error);
            }
          }
        }
        if (typeof mutableCookies.set === "function") {
          try {
            mutableCookies.set({ name, value: "", ...options, maxAge: 0 });
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              console.warn("Supabase cookie fallback set failed:", error);
            }
          }
        } else if (process.env.NODE_ENV === "development") {
          console.warn("Supabase cookie remove skipped: not in a mutable cookies context");
        }
      },
    },
  });
}
