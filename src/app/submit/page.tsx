import Link from "next/link";

import { CourtSubmitForm } from "@/components/courts/court-submit-form";
import { Button } from "@/components/ui/button";
import { getUserWithProfile } from "@/lib/auth";

export default async function SubmitPage() {
  const { user, profile } = await getUserWithProfile();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">コートを新規登録</h1>
          <p className="text-sm text-muted-foreground">
            コートの投稿にはGoogleログインが必要です。サーバーでログイン状態を確認して投稿を保存します。
          </p>
        </div>
        <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
          投稿機能を利用するにはログインしてください。
        </div>
        <Button asChild size="lg">
          <Link href="/login">Googleでログイン</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">コートを新規登録</h1>
        <p className="text-sm text-muted-foreground">
          ログイン中のアカウント: {profile?.display_name ?? user.email ?? "ユーザー"}
        </p>
        <p className="text-sm text-muted-foreground">
          地図上でピンを指定し、コート情報と写真（1枚）を登録します。投稿後すぐに公開されます。
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Google Mapsで位置を選び、PostGISの近傍検索に活用できるように緯度/経度を保存します。
        </div>
        <CourtSubmitForm />
      </div>
      <div className="rounded-xl border bg-secondary/30 p-4 text-sm">
          投稿データはPostgreSQLに保存され、写真はSupabase Storageの`court-photos`バケットにアップロードされます。
      </div>
    </div>
  );
}
