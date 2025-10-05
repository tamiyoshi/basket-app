"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  redirectTo?: string;
} & ButtonProps;

export function GoogleSignInButton({
  redirectTo,
  children,
  disabled,
  ...buttonProps
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Google sign-in failed", error);
    }

    setIsLoading(false);
  };

  return (
    <Button
      type="button"
      onClick={handleSignIn}
      disabled={isLoading || disabled}
      {...buttonProps}
    >
      {isLoading ? "リダイレクト中..." : children ?? "Googleアカウントでログイン"}
    </Button>
  );
}
