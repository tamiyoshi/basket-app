import Link from "next/link";
import { Filter, MapPinned, Sparkles } from "lucide-react";

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
  const mapHasCourts = courts.some(
    (court) => typeof court.latitude === "number" && typeof court.longitude === "number",
  );

  return (
    <div className="space-y-16">
      <section className="space-y-8">
        <div className="overflow-hidden rounded-[40px] border border-border/60 shadow-[0_30px_120px_rgba(15,23,42,0.45)]">
          <CourtMap
            courts={courts}
            location={useLocation}
            className="h-[80vh] min-h-[420px] w-full border-none shadow-none"
          />
        </div>
        {!mapHasCourts ? (
          <div className="rounded-[28px] border border-dashed bg-muted/40 p-5 text-sm text-muted-foreground">
            コートがまだ表示されていません。地図をドラッグして別エリアを表示するか、検索条件をリセットしてみてください。
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-5 rounded-[32px] border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-[0_24px_90px_rgba(15,23,42,0.5)]">
            <div className="space-y-4 text-balance">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                全国のストリートコートを、地図で直感的に。
              </h1>
              <p className="text-sm text-white/80 sm:text-base">
                行きたい街のバスケットコートを検索して、設備やレビューを確認。旅先でもすぐにプレーできる場所を見つけられます。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/submit">新しいコートを投稿</Link>
              </Button>
              {!isLoggedIn ? (
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto text-black">
                  <Link href="/login">Googleでログイン</Link>
                </Button>
              ) : null}
            </div>
            <ul className="space-y-2 text-sm text-white/75">
              <li className="flex items-start gap-2">
                <MapPinned className="mt-1 h-4 w-4 text-primary" />
                <span>マップをドラッグしてコートを探し、ピンをタップすると詳細ページに移動できます。</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-1 h-4 w-4 text-primary" />
                <span>投稿に写真やレビューを追加すると、コミュニティの精度が向上します。</span>
              </li>
            </ul>
          </div>
          <div className="rounded-[32px] border border-border/60 bg-card/95 p-8 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground">最短でコートにたどり着くには</h2>
            <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">1. 現在地を設定</span>
                <p>位置情報を許可すると、近くのコートが自動的に優先表示されます。</p>
              </li>
              <li>
                <span className="font-medium text-foreground">2. タグと料金で絞り込み</span>
                <p>駐車場や照明などの条件を選ぶと、目的に合うコートが見つかります。</p>
              </li>
              <li>
                <span className="font-medium text-foreground">3. レビューをチェック</span>
                <p>コミュニティの声を参考に、雰囲気や混雑状況を確認しましょう。</p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-border/70 bg-card/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MapPinned className="h-4 w-4 text-primary" />
            現在地から探す
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            位置情報を許可すると半径を指定して近くのコートを優先表示します。旅行先や遠征でも最寄りのピックアップゲームをすばやく発見。
          </p>
          <LocationFilter className="mt-5 space-y-4" />
        </div>
        <div className="rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            コミュニティからの注目ポイント
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span>レビュー平均点で自動的にランキングが更新され、人気コートが一目でわかります。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span>設備タグや料金フィルタを組み合わせて、練習スタイルに合うコートだけを表示できます。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span>Supabase と Google Maps の連携で、投稿後すぐに地図へ反映されるスピード感。</span>
            </li>
          </ul>
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
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
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

          <div className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <span>現在ページ: {page}</span>
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
