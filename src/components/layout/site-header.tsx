import Link from "next/link";

import { signOut } from "@/lib/actions/auth";
import { getSessionWithProfile } from "@/lib/auth";

import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const { session, profile } = await getSessionWithProfile();
  const displayName = profile?.display_name ?? session?.user?.email ?? null;

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">HoopSpotter</p>
          <p className="text-xs text-muted-foreground">
            全国の屋外バスケットコート検索コミュニティ
          </p>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-2 font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            コートを探す
          </Link>
          <Link
            href="/ranking"
            className="rounded-md px-3 py-2 font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            人気ランキング
          </Link>
          <Link
            href="/submit"
            className="rounded-md px-3 py-2 font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            新規登録
          </Link>
          {session ? (
            <div className="flex items-center gap-2">
              {displayName ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {displayName}
                </span>
              ) : null}
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  ログアウト
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/login">Googleでログイン</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
