-- Run against a PostgreSQL database with PostGIS available.
-- The application connects directly to this database; Supabase Auth and Storage are separate services.

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  role public.user_role NOT NULL DEFAULT 'user',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  address text NOT NULL CHECK (char_length(address) BETWEEN 5 AND 500),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  geom geography(point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  is_free boolean NOT NULL DEFAULT true,
  hoop_count integer CHECK (hoop_count IS NULL OR hoop_count >= 0),
  surface text,
  facility_tags text[] NOT NULL DEFAULT '{}',
  notes text,
  opening_hours text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courts_geom_gist ON public.courts USING gist (geom);
CREATE INDEX IF NOT EXISTS courts_created_at_idx ON public.courts (created_at DESC);
CREATE INDEX IF NOT EXISTS courts_facility_tags_gin ON public.courts USING gin (facility_tags);
CREATE INDEX IF NOT EXISTS courts_created_by_idx ON public.courts (created_by);

CREATE TABLE IF NOT EXISTS public.court_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS court_photos_court_id_idx ON public.court_photos (court_id);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_one_per_author_per_court UNIQUE (court_id, author_id)
);

CREATE INDEX IF NOT EXISTS reviews_court_id_idx ON public.reviews (court_id);
CREATE INDEX IF NOT EXISTS reviews_author_id_idx ON public.reviews (author_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS courts_set_updated_at ON public.courts;
CREATE TRIGGER courts_set_updated_at
  BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.court_with_stats AS
SELECT
  c.id,
  c.name,
  c.address,
  c.latitude,
  c.longitude,
  c.is_free,
  c.hoop_count,
  c.surface,
  c.facility_tags,
  c.notes,
  c.opening_hours,
  c.created_by,
  c.created_at,
  c.updated_at,
  round(avg(r.rating)::numeric, 1)::double precision AS average_rating,
  count(r.id)::integer AS review_count
FROM public.courts AS c
LEFT JOIN public.reviews AS r ON r.court_id = c.id
GROUP BY c.id;
