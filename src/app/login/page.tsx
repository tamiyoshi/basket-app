import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, getSupabaseSession } from "@/lib/auth";

import { signOut } from "./actions";

export default async function LoginPage() {
  const session = await getSupabaseSession();
  const profile = await getCurrentProfile();

  if (session) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">ログイン済み</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.display_name ?? session.user.email ?? "ユーザー"} さん、ようこそ！
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            これでコート投稿やレビュー投稿が行えます。コート一覧に戻って近隣のコートを探しましょう。
          </p>
          <div className="grid gap-2">
            <Button asChild>
              <Link href="/">トップページへ戻る</Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Googleでログイン</h1>
        <p className="text-sm text-muted-foreground">
          Supabase Authを利用したGoogle OAuthで認証します。ログイン後は投稿・レビュー機能が有効化されます。
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <GoogleSignInButton size="lg" className="w-full">
          Googleアカウントでログイン
        </GoogleSignInButton>
        <p className="text-center text-xs text-muted-foreground">
          認証後は`/auth/callback`を経由してセッションを保存します。
        </p>
      </div>
    </div>
  );
}
