import { getDb } from "@/lib/db";
import type { CourtPhotoRow, CourtRow, ReviewRow } from "@/types/database";

export type CourtSummary = CourtRow & {
  reviewCount: number;
  averageRating: number | null;
  distanceMeters?: number | null;
  facilityTags: string[];
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
  facilityTag?: string | null;
  useLocation?: {
    lat: number;
    lng: number;
    radiusMeters?: number;
  } | null;
};

type CourtStatsRow = CourtRow & {
  average_rating: number | null;
  review_count: number;
};

function normalizePagination(limit = 12, offset = 0) {
  return {
    limit: Math.min(Math.max(Math.floor(limit), 1), 100),
    offset: Math.min(Math.max(Math.floor(offset), 0), 100000),
  };
}

function mapCourtRow(row: CourtStatsRow): CourtSummary {
  return {
    ...row,
    reviewCount: Number(row.review_count),
    averageRating: row.average_rating,
    facilityTags: row.facility_tags ?? [],
  };
}

export async function getCourts(filters: CourtSearchFilters = {}): Promise<CourtSummary[]> {
  const sql = getDb();
  const { limit, offset } = normalizePagination(filters.limit, filters.offset);
  const isFree = filters.isFree ?? null;
  const facilityTag = filters.facilityTag?.trim() || null;

  if (filters.useLocation) {
    const { lat, lng } = filters.useLocation;
    const radius = Math.min(Math.max(Math.floor(filters.useLocation.radiusMeters ?? 5000), 1), 50000);
    const rows = await sql<CourtStatsRow & { distance_m: number }[]>`
      SELECT
        c.id, c.name, c.address, c.latitude, c.longitude, c.is_free, c.hoop_count,
        c.surface, c.facility_tags, c.notes, c.opening_hours, c.created_by,
        c.created_at, c.updated_at,
        s.average_rating, s.review_count,
        ST_Distance(c.geom, point.location)::double precision AS distance_m
      FROM public.courts AS c
      JOIN public.court_with_stats AS s ON s.id = c.id
      CROSS JOIN (
        SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography AS location
      ) AS point
      WHERE ST_DWithin(c.geom, point.location, ${radius})
        AND (${isFree}::boolean IS NULL OR c.is_free = ${isFree})
        AND (${facilityTag}::text IS NULL OR ${facilityTag} = ANY(c.facility_tags))
      ORDER BY distance_m ASC, c.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows.map((row) => ({ ...mapCourtRow(row), distanceMeters: row.distance_m }));
  }

  const rows = await sql<CourtStatsRow[]>`
    SELECT
      id, name, address, latitude, longitude, is_free, hoop_count, surface,
      facility_tags, notes, opening_hours, created_by, created_at, updated_at,
      average_rating, review_count
    FROM public.court_with_stats
    WHERE (${isFree}::boolean IS NULL OR is_free = ${isFree})
      AND (${facilityTag}::text IS NULL OR ${facilityTag} = ANY(facility_tags))
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return rows.map(mapCourtRow);
}

export async function getRankingCourts(limit = 20) {
  const sql = getDb();
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const rows = await sql<{
    id: string;
    name: string;
    address: string;
    average_rating: number | null;
    review_count: number;
    facility_tags: string[];
  }[]>`
    SELECT id, name, address, average_rating, review_count, facility_tags
    FROM public.court_with_stats
    WHERE review_count > 0
    ORDER BY average_rating DESC NULLS LAST, review_count DESC, name ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    ...row,
    reviewCount: Number(row.review_count),
    facilityTags: row.facility_tags ?? [],
  }));
}

export async function getCourtById(id: string): Promise<CourtDetail | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  const sql = getDb();
  const rows = await sql<(CourtStatsRow & { photos: CourtPhotoRow[] })[]>`
    SELECT
      c.id, c.name, c.address, c.latitude, c.longitude, c.is_free, c.hoop_count,
      c.surface, c.facility_tags, c.notes, c.opening_hours, c.created_by,
      c.created_at, c.updated_at,
      s.average_rating, s.review_count,
      COALESCE(photo_list.photos, '[]'::json) AS photos
    FROM public.courts AS c
    JOIN public.court_with_stats AS s ON s.id = c.id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', p.id,
          'court_id', p.court_id,
          'storage_path', p.storage_path,
          'uploaded_by', p.uploaded_by,
          'created_at', p.created_at
        ) ORDER BY p.created_at DESC
      ) AS photos
      FROM public.court_photos AS p
      WHERE p.court_id = c.id
    ) AS photo_list ON true
    WHERE c.id = ${id}::uuid
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    photos: row.photos ?? [],
    reviewCount: Number(row.review_count),
    averageRating: row.average_rating,
  };
}

export async function getCourtReviews(courtId: string): Promise<ReviewWithAuthor[]> {
  const sql = getDb();

  return sql<ReviewWithAuthor[]>`
    SELECT
      r.id, r.court_id, r.author_id, r.rating, r.comment, r.created_at, r.updated_at,
      CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ) END AS author
    FROM public.reviews AS r
    LEFT JOIN public.profiles AS p ON p.id = r.author_id
    WHERE r.court_id = ${courtId}::uuid
    ORDER BY r.created_at DESC, r.id DESC
  `;
}
