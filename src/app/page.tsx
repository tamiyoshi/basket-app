import Link from "next/link";
import { Compass, Filter, MapPinned } from "lucide-react";

import { CourtCard } from "@/components/courts/court-card";
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

  const useLocation =
    typeof lat === "number" && typeof lng === "number"
      ? {
          lat,
          lng,
          radiusMeters: typeof radius === "number" ? radius : undefined,
        }
      : null;

  const courts = await getCourts({
    isFree,
    limit: 12,
    useLocation,
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
            <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Google Maps API でコートを描画します
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Supabaseの近傍検索（PostGIS + GIST）を利用して、現在地中心のピンを表示予定です。
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
          {courts.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              条件に合うコートがまだ登録されていません。最初の投稿者としてコート情報を追加しましょう！
            </div>
          ) : (
            <ul className="grid gap-4">
              {courts.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </ul>
          )}
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
