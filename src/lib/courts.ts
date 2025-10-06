import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type CourtRow = Database["public"]["Tables"]["courts"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type CourtPhotoRow = Database["public"]["Tables"]["court_photos"]["Row"];
export type CourtWithStatsRow = Database["public"]["Views"]["court_with_stats"]["Row"];

type NearbyCourtRow = CourtRow & {
  distance_m: number;
  average_rating: number | null;
  review_count: number;
};

export type CourtSummary = CourtRow & {
  reviewCount: number;
  averageRating: number | null;
  distanceMeters?: number | null;
};

export type CourtDetail = CourtRow & {
  photos: CourtPhotoRow[];
  reviewCount: number;
  averageRating: number | null;
};

export type ReviewWithAuthor = ReviewRow & {
  author: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type CourtSearchFilters = {
  isFree?: boolean | null;
  limit?: number;
  offset?: number;
  useLocation?: {
    lat: number;
    lng: number;
    radiusMeters?: number;
  } | null;
};

function calculateRatingSummary(reviews: Pick<ReviewRow, "rating">[]) {
  if (!reviews?.length) {
    return { reviewCount: 0, averageRating: null } as const;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    reviewCount: reviews.length,
    averageRating: Math.round((total / reviews.length) * 10) / 10,
  } as const;
}

export async function getCourts(filters: CourtSearchFilters = {}): Promise<CourtSummary[]> {
  const supabase = createSupabaseServerClient();
  const limit = filters.limit ?? 12;

  if (filters.useLocation) {
    const radius = filters.useLocation.radiusMeters ?? 5000;
    const { data, error } = await supabase.rpc("courts_nearby", {
      lat: filters.useLocation.lat,
      lng: filters.useLocation.lng,
      radius_m: radius,
      limit_count: limit,
    });

    if (error) {
      console.error("Failed to fetch nearby courts", error);
      throw new Error(error.message ?? "コート情報の取得に失敗しました");
    }

    const nearby = (data as NearbyCourtRow[] | null) ?? [];
    return nearby
      .filter((court) => {
        if (filters.isFree === undefined || filters.isFree === null) {
          return true;
        }
        return court.is_free === filters.isFree;
      })
      .map((court) => ({
        ...court,
        averageRating: court.average_rating ?? null,
        reviewCount: court.review_count ?? 0,
        distanceMeters: court.distance_m ?? null,
      }));
  }

  const offset = filters.offset ?? 0;

  let query = supabase
    .from("court_with_stats")
    .select(
      `
      id,
      name,
      address,
      latitude,
      longitude,
      is_free,
      hoop_count,
      surface,
      notes,
      opening_hours,
      created_by,
      created_at,
      updated_at,
      average_rating,
      review_count
    `,
    )
    .order("created_at", { ascending: false });

  if (filters.isFree !== undefined && filters.isFree !== null) {
    query = query.eq("is_free", filters.isFree);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query.returns<CourtWithStatsRow[]>();

  if (error) {
    const message = error?.message ?? String(error);

    if (message.includes("court_with_stats")) {
      return fetchCourtsFromBaseTable({
        supabase,
        limit,
        offset,
        isFree: filters.isFree,
      });
    }

    if (message.includes("Invalid API key")) {
      console.error("Failed to fetch courts", message);
      throw new Error("Supabase API キーが無効です。環境変数 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。");
    }

    console.error("Failed to fetch courts", message);
    throw new Error(message ?? "コート情報の取得に失敗しました");
  }

  return (data ?? []).map(({ average_rating, review_count, ...rest }) => ({
    ...rest,
    reviewCount: Number(review_count ?? 0),
    averageRating: average_rating ?? null,
    distanceMeters: undefined,
  }));
}

async function fetchCourtsFromBaseTable(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  limit: number;
  offset: number;
  isFree?: boolean | null;
}) {
  const { supabase, limit, offset, isFree } = params;

  let query = supabase
    .from("courts")
    .select(
      `
      id,
      name,
      address,
      latitude,
      longitude,
      is_free,
      hoop_count,
      surface,
      notes,
      opening_hours,
      created_by,
      created_at,
      updated_at,
      reviews:reviews(rating)
    `,
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (isFree !== undefined && isFree !== null) {
    query = query.eq("is_free", isFree);
  }

  const { data, error } = await query;

  if (error) {
    const message = error.message ?? String(error);
    if (message.includes("public.courts")) {
      console.warn(
        "Supabase schema 未適用のため courts テーブルにアクセスできません。supabase/schema.sql を適用してください。",
      );
      return [];
    }

    if (message.includes("Invalid API key")) {
      console.error("Failed to fetch courts (fallback)", message);
      throw new Error("Supabase API キーが無効です。環境変数 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。");
    }

    console.error("Failed to fetch courts (fallback)", message);
    throw new Error(message ?? "コート情報の取得に失敗しました");
  }

  return (data ?? []).map((court) => {
    const { reviews, ...rest } = court;
    const { averageRating, reviewCount } = calculateRatingSummary(reviews ?? []);

    return {
      ...rest,
      reviewCount,
      averageRating,
      distanceMeters: undefined,
    } as CourtSummary;
  });
}

export async function getCourtById(id: string): Promise<CourtDetail | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("courts")
    .select(
      `
      id,
      name,
      address,
      latitude,
      longitude,
      is_free,
      hoop_count,
      surface,
      notes,
      opening_hours,
      created_by,
      created_at,
      updated_at,
      photos:court_photos(id, storage_path, uploaded_by, created_at),
      reviews:reviews(rating)
    `,
    )
    .eq("id", id)
    .maybeSingle()
    .returns<
      (CourtRow & {
        photos: CourtPhotoRow[];
        reviews: Pick<ReviewRow, "rating">[];
      }) | null
    >();

  if (error) {
    console.error("Failed to fetch court detail", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const { reviews, ...rest } = data;
  const { averageRating, reviewCount } = calculateRatingSummary(reviews ?? []);

  return {
    ...rest,
    photos: data.photos ?? [],
    averageRating,
    reviewCount,
  } as CourtDetail;
}

export async function getCourtReviews(courtId: string): Promise<ReviewWithAuthor[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      court_id,
      author_id,
      rating,
      comment,
      created_at,
      updated_at,
      author:profiles!reviews_author_id_fkey (id, display_name, avatar_url)
    `,
    )
    .eq("court_id", courtId)
    .order("created_at", { ascending: false })
    .returns<
      (ReviewRow & {
        author: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
        } | null;
      })[]
    >();

  if (error) {
    console.error("Failed to fetch court reviews", error);
    return [];
  }

  return (data ?? []).map((review) => ({
    ...review,
  } as ReviewWithAuthor));
}
