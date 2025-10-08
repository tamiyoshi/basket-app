import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Camera, MapPin, Star } from "lucide-react";

import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewCard } from "@/components/reviews/review-card";
import { Button } from "@/components/ui/button";
import { getCourtById, getCourtReviews } from "@/lib/courts";
import { getSessionWithProfile } from "@/lib/auth";

const photoBucketBase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/court-photos`
  : null;

function formatAddress(address: string) {
  return address.replace(/\n/g, " ");
}

function formatRating(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return value.toFixed(1);
}

function getPhotoUrl(storagePath: string) {
  if (photoBucketBase) {
    return `${photoBucketBase}/${storagePath}`;
  }

  return storagePath;
}

type CourtDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: CourtDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const court = await getCourtById(id);

  if (!court) {
    return {
      title: "コート詳細",
    };
  }

  return {
    title: `${court.name}の詳細情報`,
    description: `${court.address} にある屋外バスケットコートの詳細。レビュー件数: ${court.reviewCount}、平均評価: ${formatRating(court.averageRating)}`,
  };
}

export default async function CourtDetailPage({ params }: CourtDetailPageProps) {
  const { id } = await params;
  const court = await getCourtById(id);

  if (!court) {
    notFound();
  }

  const reviews = await getCourtReviews(id);
  const { session } = await getSessionWithProfile();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{court.name}</h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{formatAddress(court.address)}</span>
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4 text-primary" />
              {formatRating(court.averageRating)}
            </div>
            <p className="text-xs text-muted-foreground">レビュー {court.reviewCount} 件</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          利用料金: {court.is_free ? "無料" : "有料"} / リング数: {court.hoop_count ?? "情報未登録"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <header className="space-y-2">
            <h2 className="text-lg font-semibold">基本情報</h2>
            <p className="text-sm text-muted-foreground">
              Supabaseの`courts`テーブルからSSRで取得した情報を表示しています。
            </p>
          </header>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                住所
              </dt>
              <dd className="text-sm">{court.address}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                利用料金
              </dt>
              <dd className="text-sm">{court.is_free ? "無料" : "有料"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                地面
              </dt>
              <dd className="text-sm">{court.surface ?? "情報未登録"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                営業時間
              </dt>
              <dd className="text-sm">{court.opening_hours ?? "情報未登録"}</dd>
            </div>
          </dl>

          {court.facility_tags && court.facility_tags.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">設備タグ</h3>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {court.facility_tags.map((tag) => (
                  <span key={tag} className="rounded-full border px-2.5 py-1">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Camera className="h-4 w-4" />
              写真
            </h3>
            {court.photos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                写真はまだ投稿されていません。ログイン後に追加できます。
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {court.photos.map((photo) => (
                  <li key={photo.id} className="overflow-hidden rounded-lg border">
                    <Image
                      src={getPhotoUrl(photo.storage_path)}
                      alt={`${court.name} の写真`}
                      width={800}
                      height={480}
                      className="h-48 w-full object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">備考</h3>
            <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              {court.notes ?? "備考はまだ登録されていません。"}
            </p>
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">次のステップ</h2>
          <p className="text-sm text-muted-foreground">
            レビュー投稿と写真追加はログインユーザーのみが利用できます。
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">Googleでログイン</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/submit">コート情報を更新する</Link>
            </Button>
          </div>
          <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
            投稿はRLSにより認証済みユーザーのみ可能。承認フローは設けず即時公開されます。
          </div>
        </aside>
      </div>

      <section className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">レビュー</h2>
            <p className="text-sm text-muted-foreground">
              Supabaseの`reviews`テーブルに保存されたユーザーの声を表示します。
            </p>
          </div>
          {!session ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">ログインしてレビューを投稿</Link>
            </Button>
          ) : null}
        </header>

        {session ? (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">レビューを投稿</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              星を選択し、プレー環境や混雑状況などのコメントを共有してください。
            </p>
            <ReviewForm courtId={court.id} className="mt-4" />
          </div>
        ) : null}

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
            まだレビューがありません。Googleログイン後に最初のレビューを投稿しましょう。
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
