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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Google sign-in failed", error);
        setErrorMessage("Googleログインを開始できませんでした。時間をおいて再度お試しください。");
      }
    } catch (error) {
      console.error("Google sign-in failed", error);
      setErrorMessage("Googleログインを開始できませんでした。時間をおいて再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading || disabled}
        {...buttonProps}
      >
        {isLoading ? "リダイレクト中..." : children ?? "Googleアカウントでログイン"}
      </Button>
      {errorMessage ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
