import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  let safeTarget = new URL("/", requestUrl.origin);
  try {
    const requestedTarget = new URL(next, requestUrl.origin);
    if (requestedTarget.origin === requestUrl.origin) safeTarget = requestedTarget;
  } catch {
    // Ignore malformed or external redirect targets.
  }

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Failed to exchange auth code", error);
      return NextResponse.redirect(requestUrl.origin + "/login?error=auth");
    }
  }

  return NextResponse.redirect(safeTarget);
}
