-- Run via Supabase SQL editor or CLI migrations

-- Enable required extensions
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'uuid-ossp') then
    execute 'create extension if not exists "uuid-ossp";';
  end if;
  if not exists (select 1 from pg_available_extensions where name = 'postgis') then
    execute 'create extension if not exists postgis;';
  end if;
end $$;

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture')
from auth.users
on conflict (id) do nothing;

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
  facility_tags text[] not null default '{}',
  notes text,
  opening_hours text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for courts
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and tablename = 'courts' and indexname = 'courts_geom_gist'
  ) then
    execute 'create index courts_geom_gist on public.courts using gist (geom);';
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and tablename = 'courts' and indexname = 'courts_created_by_idx'
  ) then
    execute 'create index courts_created_by_idx on public.courts (created_by);';
  end if;
end $$;

-- Court photos table
create table if not exists public.court_photos (
  id uuid primary key default uuid_generate_v4(),
  court_id uuid not null references public.courts(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists court_photos_court_id_idx on public.court_photos (court_id);
create index if not exists court_photos_uploaded_by_idx on public.court_photos (uploaded_by);

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  court_id uuid not null references public.courts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.courts'::regclass
      and conname = 'courts_created_by_fkey'
      and confrelid <> 'public.profiles'::regclass
  ) then
    alter table public.courts drop constraint courts_created_by_fkey;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courts'::regclass
      and conname = 'courts_created_by_fkey'
  ) then
    alter table public.courts
      add constraint courts_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete cascade;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.court_photos'::regclass
      and conname = 'court_photos_uploaded_by_fkey'
      and confrelid <> 'public.profiles'::regclass
  ) then
    alter table public.court_photos drop constraint court_photos_uploaded_by_fkey;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.court_photos'::regclass
      and conname = 'court_photos_uploaded_by_fkey'
  ) then
    alter table public.court_photos
      add constraint court_photos_uploaded_by_fkey
      foreign key (uploaded_by) references public.profiles(id) on delete cascade;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_author_id_fkey'
      and confrelid <> 'public.profiles'::regclass
  ) then
    alter table public.reviews drop constraint reviews_author_id_fkey;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_author_id_fkey'
  ) then
    alter table public.reviews
      add constraint reviews_author_id_fkey
      foreign key (author_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

update public.courts set facility_tags = '{}' where facility_tags is null;
alter table public.courts alter column facility_tags set default '{}';
alter table public.courts alter column facility_tags set not null;

create index if not exists reviews_court_id_idx on public.reviews (court_id);
create index if not exists reviews_author_id_idx on public.reviews (author_id);

-- View aggregating stats
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
  facility_tags text[],
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
    c.facility_tags,
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
