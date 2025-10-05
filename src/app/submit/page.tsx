import Link from "next/link";

import { CourtSubmitForm } from "@/components/courts/court-submit-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, getSupabaseSession } from "@/lib/auth";

export default async function SubmitPage() {
  const session = await getSupabaseSession();
  const profile = await getCurrentProfile();

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">コートを新規登録</h1>
          <p className="text-sm text-muted-foreground">
            コートの投稿にはGoogleログインが必要です。認証後はSupabase StorageとRLSによって安全に投稿が保存されます。
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
          ログイン中のアカウント: {profile?.display_name ?? session.user.email ?? "ユーザー"}
        </p>
        <p className="text-sm text-muted-foreground">
          地図上でピンを指定し、コート情報と写真（1枚）を登録します。MVPでは投稿後すぐに公開され、RLSで認証ユーザーのみが登録可能となります。
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Google Mapsで位置を選び、PostGISの近傍検索に活用できるように緯度/経度を保存します。
        </div>
        <CourtSubmitForm />
      </div>
      <div className="rounded-xl border bg-secondary/30 p-4 text-sm">
        投稿データはSupabaseの`courts`・`court_photos`テーブルに保存されます。写真はStorageの`court-photos`バケットにアップロードし、RLSで本人以外の更新を制限します。
      </div>
    </div>
  );
}
