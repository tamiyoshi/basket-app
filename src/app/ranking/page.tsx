import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "人気コートランキング",
  description: "レビュー評価の高いバスケットコートを表示",
};

type RankingRow = {
  id: string;
  name: string;
  address: string;
  average_rating: number | null;
  review_count: number | null;
  facility_tags: string[] | null;
};

export default async function RankingPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("court_with_stats")
    .select("id, name, address, average_rating, review_count, facility_tags")
    .order("average_rating", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    const message = error.message ?? "ランキング情報の取得に失敗しました";
    if (message.includes("court_with_stats")) {
      return (
        <section className="mx-auto max-w-4xl space-y-6 py-10">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">人気コートランキング</h1>
            <p className="text-sm text-muted-foreground">
              Supabase スキーマを適用してから再度アクセスしてください。
            </p>
          </header>
          <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
            `supabase/schema.sql` を実行してビューを作成する必要があります。
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto max-w-4xl space-y-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">人気コートランキング</h1>
        </header>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {message}
        </div>
      </section>
    );
  }

  const rows: RankingRow[] = Array.isArray(data) ? (data as RankingRow[]) : [];

  const courts = rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    averageRating: row.average_rating,
    reviewCount: Number(row.review_count ?? 0),
    facilityTags: row.facility_tags ?? [],
  }));

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">人気コートランキング</h1>
        <p className="text-sm text-muted-foreground">
          レビュー評価の高いコートを上位20件まで表示します。
        </p>
      </header>

      {courts.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
          まだレビュー付きのコートがありません。
          <Link href="/submit" className="ml-1 text-primary underline">
            新しいコートを投稿
          </Link>
          してコミュニティを盛り上げましょう。
        </div>
      ) : (
        <ol className="space-y-4">
          {courts.map((court, index) => (
            <li key={court.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="text-3xl font-bold text-primary">{index + 1}</span>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/courts/${court.id}`} className="text-lg font-semibold hover:underline">
                      {court.name}
                    </Link>
                    <span className="text-sm font-semibold text-primary">
                      ★ {court.averageRating !== null ? court.averageRating.toFixed(1) : "-"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{court.address}</p>
                  <p className="text-xs text-muted-foreground">レビュー {court.reviewCount} 件</p>
                  {court.facilityTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {court.facilityTags.map((tag) => (
                        <span key={tag} className="rounded-full border px-2 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
