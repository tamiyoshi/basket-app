-- Run via Supabase SQL editor or CLI migrations

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- User role enum shared across tables
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'admin');
  end if;
end $$;

-- Profiles table mirrors Supabase auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role default 'user'::user_role not null,
  avatar_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Courts table stores outdoor court metadata
create table if not exists public.courts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  geom geography(point, 4326) generated always as (
    CASE
      WHEN latitude is not null AND longitude is not null
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE null
    END
  ) stored,
  is_free boolean not null default true,
  hoop_count integer,
  surface text,
  notes text,
  opening_hours text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for courts
do $$
begin
  if not exists (
    select 1 from pg_indexes where tablename = 'courts' and indexname = 'courts_geom_gist'
  ) then
    execute 'create index courts_geom_gist on public.courts using gist (geom);';
  end if;
  if not exists (
    select 1 from pg_indexes where tablename = 'courts' and indexname = 'courts_created_by_idx'
  ) then
    execute 'create index courts_created_by_idx on public.courts (created_by);';
  end if;
end $$;

-- Court photos table
create table if not exists public.court_photos (
  id uuid primary key default uuid_generate_v4(),
  court_id uuid not null references public.courts(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists court_photos_court_id_idx on public.court_photos (court_id);
create index if not exists court_photos_uploaded_by_idx on public.court_photos (uploaded_by);

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  court_id uuid not null references public.courts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists reviews_court_id_idx on public.reviews (court_id);
create index if not exists reviews_author_id_idx on public.reviews (author_id);

-- User role enum
-- Helper view for court aggregates (optional)
create or replace view public.court_with_stats as
select
  c.*,
  coalesce(avg(r.rating)::numeric(10,2), null) as average_rating,
  count(r.id) as review_count
from public.courts c
left join public.reviews r on r.court_id = c.id
group by c.id;

-- RPC: return courts within a radius (meters) ordered by distance
create or replace function public.courts_nearby(
  lat double precision,
  lng double precision,
  radius_m integer default 5000,
  limit_count integer default 50
)
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  is_free boolean,
  hoop_count integer,
  surface text,
  notes text,
  opening_hours text,
  created_by uuid,
  distance_m double precision,
  average_rating numeric,
  review_count bigint
) security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.address,
    c.latitude,
    c.longitude,
    c.is_free,
    c.hoop_count,
    c.surface,
    c.notes,
    c.opening_hours,
    c.created_by,
    ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) as distance_m,
    avg(r.rating)::numeric(10,2) as average_rating,
    count(r.id) as review_count
  from public.courts c
  left join public.reviews r on r.court_id = c.id
  where c.geom is not null
    and ST_DWithin(
      c.geom,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  group by c.id
  order by distance_m asc
  limit limit_count;
$$ language sql;
