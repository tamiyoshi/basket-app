import Link from "next/link";
import { Compass, Filter, MapPinned, Sparkles } from "lucide-react";

import { CourtCard } from "@/components/courts/court-card";
import { CourtMap } from "@/components/courts/court-map";
import { Button } from "@/components/ui/button";
import { getCourts } from "@/lib/courts";
import { cn } from "@/lib/utils";
import { LocationFilter } from "@/components/courts/location-filter";
import { getSupabaseSession } from "@/lib/auth";

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

const facilityTagOptions = [
  { label: "駐車場", value: "駐車場" },
  { label: "照明", value: "照明" },
  { label: "トイレ", value: "トイレ" },
  { label: "ベンチ", value: "ベンチ" },
  { label: "更衣室", value: "更衣室" },
  { label: "自販機", value: "自販機" },
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

function parseStringParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (!value) {
    return undefined;
  }

  return value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const session = await getSupabaseSession();
  const isLoggedIn = Boolean(session?.user);
  const isFree = parseBooleanParam(params?.isFree ?? params?.free);
  const lat = parseNumberParam(params?.lat);
  const lng = parseNumberParam(params?.lng);
  const radius = parseNumberParam(params?.radius);
  const facilityTag = parseStringParam(params?.tag);
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
      ? { isFree, limit, useLocation, facilityTag }
      : { isFree, limit, offset, facilityTag };
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
    <div className="space-y-16">
      <section className="relative">
        <div className="relative overflow-hidden rounded-[36px] border border-border/60 bg-slate-950 shadow-[0_40px_120px_rgba(15,23,42,0.45)]">
          <CourtMap
            courts={courts}
            location={useLocation}
            className="z-0 h-[560px] rounded-[36px] border-none bg-transparent shadow-none"
          />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_60%)]" />
          <div className="pointer-events-none absolute -left-20 top-1/2 z-10 hidden h-64 w-64 -translate-y-1/2 rounded-full bg-primary/35 blur-3xl sm:block" />
          <div className="pointer-events-none absolute -right-10 top-10 z-10 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-full bg-gradient-to-r from-slate-950/80 via-slate-900/40 to-transparent sm:w-2/3" />

          <div className="pointer-events-auto absolute left-6 top-6 z-20 max-w-xl space-y-6 text-white sm:left-10 sm:top-10 md:left-14 md:top-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
              <Compass className="h-3.5 w-3.5" />
              HoopSpotter Beta
            </span>
            <div className="space-y-4 text-balance">
              <h1 className="text-3xl font-semibold sm:text-4xl lg:text-5xl">
                地図から見つける、<br className="hidden sm:block" />
                最高のストリートコート。
              </h1>
              <p className="text-sm text-white/80 sm:text-base">
                現在地から近い屋外コートをすばやくチェック。レビューや設備タグで自分に合った場所が見つかります。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/submit">新しいコートを投稿</Link>
              </Button>
              {!isLoggedIn ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link href="/login">Googleでログイン</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-border/70 bg-card/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MapPinned className="h-4 w-4 text-primary" />
            現在地から探す
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            位置情報を許可すると半径を指定して近くのコートを優先表示します。旅行先や遠征でも最寄りのピックアップゲームをすばやく発見。
          </p>
          <LocationFilter className="mt-5 space-y-4" />
        </div>
        <div className="rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            コミュニティからの注目ポイント
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>・ レビューの平均点で自動的にランキングが更新され、人気コートが一目でわかります。</p>
            <p>・ 設備タグや料金フィルタを組み合わせて、練習スタイルに合うコートだけを表示。</p>
            <p>・ Supabase + Google Maps のリアルタイム連携で、投稿後すぐに地図へ反映されます。</p>
          </div>
        </div>
      </section>

      <section className="grid gap-10 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">最新のコート情報</h2>
              <p className="text-sm text-muted-foreground">
                SupabaseからSSRで取得したコミュニティ投稿の一覧です。
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/submit">コートを追加</Link>
            </Button>
          </header>

          {fetchError ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
              {fetchError}
            </div>
          ) : courts.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
              条件に合うコートがまだ登録されていません。位置情報を許可するか、
              <Link href="/submit" className="ml-1 text-primary underline">
                新しいコートを投稿
              </Link>
              してコミュニティを盛り上げましょう。
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {courts.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </ul>
          )}

          <div className="rounded-3xl border bg-card/80 p-4 text-sm text-muted-foreground shadow-sm sm:flex sm:items-center sm:justify-between">
            <span>現在ページ: {page}</span>
            <div className="mt-3 flex items-center gap-2 sm:mt-0">
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

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="h-4 w-4" />
              条件で絞り込む
            </div>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>距離</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    soon
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {distanceFilters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      className="rounded-full border border-dashed border-input px-4 py-1 text-sm text-muted-foreground/70"
                      disabled
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
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

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  設備タグ
                </p>
                <div className="flex flex-wrap gap-2">
                  {facilityTagOptions.map((option) => {
                    const isActive = facilityTag === option.value;
                    const href = buildHref(params, {
                      tag: isActive ? undefined : option.value,
                      page: undefined,
                    });

                    return (
                      <Link
                        key={option.value}
                        href={href}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition",
                          isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input hover:border-primary hover:text-primary",
                        )}
                      >
                        {option.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-dashed bg-muted/40 p-5 text-sm text-muted-foreground">
            投稿・レビューにはGoogleログインが必要です。Supabase Authと連携し、コミュニティの信頼性を保ちながら即時公開を想定しています。
          </div>
        </aside>
      </section>
    </div>
  );
}
