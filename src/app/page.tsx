import Link from "next/link";
import { Compass, Filter, MapPinned } from "lucide-react";

import { CourtCard } from "@/components/courts/court-card";
import { CourtMap } from "@/components/courts/court-map";
import { Button } from "@/components/ui/button";
import { getCourts } from "@/lib/courts";
import { cn } from "@/lib/utils";
import { LocationFilter } from "@/components/courts/location-filter";

const distanceFilters = [
  { label: "1km", value: 1 },
  { label: "3km", value: 3 },
  { label: "10km", value: 10 },
];

const priceFilters = [
  { label: "すべて", value: undefined },
  { label: "無料", value: true },
  { label: "有料", value: false },
] as const;

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(
  current: Record<string, string | string[] | undefined> | undefined,
  overrides: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  if (current) {
    for (const [key, value] of Object.entries(current)) {
      if (value === undefined || key in overrides) {
        continue;
      }

      const resolved = Array.isArray(value) ? value[0] : value;

      if (resolved !== undefined) {
        params.set(key, resolved);
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function parseBooleanParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return undefined;
}

function parseNumberParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const isFree = parseBooleanParam(params?.isFree ?? params?.free);
  const lat = parseNumberParam(params?.lat);
  const lng = parseNumberParam(params?.lng);
  const radius = parseNumberParam(params?.radius);
  const pageParam = parseNumberParam(params?.page);
  const page = pageParam && pageParam > 0 ? Math.floor(pageParam) : 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  const useLocation =
    typeof lat === "number" && typeof lng === "number"
      ? {
          lat,
          lng,
          radiusMeters: typeof radius === "number" ? radius : undefined,
        }
      : null;

  let courts = [] as Awaited<ReturnType<typeof getCourts>>;
  let fetchError: string | null = null;

  try {
    const filters = useLocation
      ? { isFree, limit, useLocation }
      : { isFree, limit, offset };
    courts = await getCourts(filters);
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "コート情報の取得に失敗しました";
    courts = [];
  }

  const hasPrevPage = page > 1;
  const hasNextPage = !fetchError && courts.length === limit;
  const nextPageHref = buildHref(params, { page: String(page + 1) });
  const previousPage = page - 1;
  const prevPageHref = buildHref(params, {
    page: hasPrevPage && previousPage > 1 ? String(previousPage) : undefined,
  });

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Compass className="h-3.5 w-3.5" />
          全国の屋外バスケットコート検索MVP
        </span>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              近くのバスケットコートをもっと気軽に。
            </h1>
            <p className="text-base text-muted-foreground">
              HoopSpotterは、屋外バスケットコートを地図から探してレビューや情報を共有できるコミュニティアプリです。SSRで地図＋リスト表示を行い、ユーザー投稿によって最新情報を保ちます。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/submit">新しいコートを投稿</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Googleでログイン</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <MapPinned className="h-4 w-4" />
              地図プレビュー（開発予定）
            </h2>
            <CourtMap courts={courts} location={useLocation} className="mt-4" />
            <p className="mt-3 text-xs text-muted-foreground">
              Supabaseの近傍検索（PostGIS + GIST）とGoogle Mapsで現在地周辺のコートを可視化します。
            </p>
            <LocationFilter />
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">コート一覧</h2>
                <p className="text-sm text-muted-foreground">
                  SupabaseからSSRで取得した最新のコート情報を表示します。
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/submit">コートを追加</Link>
            </Button>
          </header>
          {fetchError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
              {fetchError}
            </div>
          ) : courts.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              条件に合うコートがまだ登録されていません。位置情報を許可するか、
              <Link href="/submit" className="ml-1 text-primary underline">
                新しいコートを投稿
              </Link>
              してコミュニティを盛り上げましょう。
            </div>
          ) : (
            <ul className="grid gap-4">
              {courts.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t pt-4 text-sm">
            <div>
              現在ページ: {page}
            </div>
            <div className="flex items-center gap-2">
              {hasPrevPage ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={prevPageHref}>前へ</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  前へ
                </Button>
              )}
              {hasNextPage ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={nextPageHref}>次へ</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  次へ
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            条件で絞り込む
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              距離（開発予定）
            </p>
            <div className="flex flex-wrap gap-2">
              {distanceFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className="rounded-full border border-input px-4 py-1 text-sm text-muted-foreground"
                  disabled
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              料金
            </p>
            <div className="flex flex-wrap gap-2">
              {priceFilters.map((filter) => {
                const isActive = isFree === filter.value;
    const href =
      filter.value === undefined
                    ? buildHref(params, { isFree: undefined })
                    : buildHref(params, {
                        isFree: filter.value ? "true" : "false",
                      });

                return (
                  <Link
                    key={filter.label}
                    href={href}
                    className={cn(
                      "rounded-full border px-4 py-1 text-sm transition",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:border-primary hover:text-primary",
                    )}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            投稿・レビューにはGoogleログインが必要です。Supabase Authと連携し、即時公開運用を想定しています。
          </div>
        </aside>
      </section>
    </div>
  );
}
