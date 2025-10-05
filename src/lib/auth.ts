import type { Session, User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function fetchSupabaseSession() {
  const supabase = createSupabaseServerClient();
  const response = await supabase.auth.getSession();

  if (response.error) {
    console.error("Failed to fetch Supabase session", response.error);
    return { supabase, session: null as Session | null } as const;
  }

  return { supabase, session: response.data.session } as const;
}

export async function getSupabaseSession() {
  const { session } = await fetchSupabaseSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getSupabaseSession();
  return session?.user ?? null;
}

export async function getCurrentProfile() {
  const { profile } = await getSessionWithProfile();
  return profile;
}

export async function getSessionWithProfile() {
  const { supabase, session } = await fetchSupabaseSession();

  if (!session?.user) {
    return { session: null, profile: null } as const;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
    return { session, profile: null } as const;
  }

  return { session, profile: data } as const;
}

export type SupabaseSession = Session | null;
export type SupabaseUser = User | null;
