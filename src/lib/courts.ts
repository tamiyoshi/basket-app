import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type CourtRow = Database["public"]["Tables"]["courts"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type CourtPhotoRow = Database["public"]["Tables"]["court_photos"]["Row"];

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

  if (filters.useLocation) {
    const radius = filters.useLocation.radiusMeters ?? 5000;
    const limit = filters.limit ?? 50;
    const { data, error } = (await supabase.rpc("courts_nearby", {
      lat: filters.useLocation.lat,
      lng: filters.useLocation.lng,
      radius_m: radius,
      limit_count: limit,
    })) as {
      data: Array<
        CourtRow & {
          distance_m: number;
          average_rating: number | null;
          review_count: number;
        }
      > | null;
      error: { message: string } | null;
    };

    if (error) {
      console.error("Failed to fetch nearby courts", error);
      return [];
    }

    const nearby = data ?? [];
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
    .order("created_at", { ascending: false });

  if (filters.isFree !== undefined && filters.isFree !== null) {
    query = query.eq("is_free", filters.isFree);
  }

  if (typeof filters.limit === "number") {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.returns<
    (CourtRow & { reviews: Pick<ReviewRow, "rating">[] })[]
  >();

  if (error) {
    console.error("Failed to fetch courts", error);
    return [];
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
