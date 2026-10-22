import type { User } from "@supabase/supabase-js";

import { getDb } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to verify Supabase user", error);
    return null;
  }

  return data.user;
}

function metadataString(user: User, ...keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function ensureProfile(user: User): Promise<ProfileRow> {
  const sql = getDb();
  const displayName = metadataString(user, "display_name", "full_name", "name");
  const avatarUrl = metadataString(user, "avatar_url", "picture");
  const rows = await sql<ProfileRow[]>`
    INSERT INTO public.profiles AS existing (id, display_name, avatar_url)
    VALUES (${user.id}::uuid, ${displayName}, ${avatarUrl})
    ON CONFLICT (id) DO UPDATE SET
      display_name = COALESCE(existing.display_name, EXCLUDED.display_name),
      avatar_url = COALESCE(existing.avatar_url, EXCLUDED.avatar_url)
    RETURNING id, display_name, role, avatar_url, created_at, updated_at
  `;

  const profile = rows[0];
  if (!profile) throw new Error("プロフィールを作成できませんでした");
  return profile;
}

async function getOrCreateProfile(user: User): Promise<ProfileRow> {
  const sql = getDb();
  const rows = await sql<ProfileRow[]>`
    SELECT id, display_name, role, avatar_url, created_at, updated_at
    FROM public.profiles
    WHERE id = ${user.id}::uuid
    LIMIT 1
  `;

  return rows[0] ?? ensureProfile(user);
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    return await getOrCreateProfile(user);
  } catch (error) {
    console.error("Failed to load profile from PostgreSQL", error);
    return null;
  }
}

export async function getUserWithProfile() {
  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null } as const;

  try {
    const profile = await getOrCreateProfile(user);
    return { user, profile } as const;
  } catch (error) {
    console.error("Failed to load profile from PostgreSQL", error);
    return { user, profile: null } as const;
  }
}

export type SupabaseUser = User | null;
