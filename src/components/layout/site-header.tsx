import Link from "next/link";

import { signOut } from "@/lib/actions/auth";
import { getSessionWithProfile } from "@/lib/auth";

import { Button } from "@/components/ui/button";

const navigationLinks = [
  { href: "/", label: "コートを探す" },
  { href: "/ranking", label: "人気ランキング" },
  { href: "/submit", label: "新規登録" },
];

export async function SiteHeader() {
  const { session, profile } = await getSessionWithProfile();
  const displayName = profile?.display_name ?? session?.user?.email ?? null;
  const isLoggedIn = Boolean(session);

  return (
    <header className="border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">Street Court Explorer</p>
          <p className="text-xs text-muted-foreground">
            全国の屋外バスケットコート検索コミュニティ
          </p>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              {displayName ? (
                <span className="text-xs text-muted-foreground">{displayName}</span>
              ) : null}
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  ログアウト
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link href="/login">Googleでログイン</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
