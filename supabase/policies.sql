-- Row-Level Security policies for HoopSpotter
-- Execute after schema.sql has been applied

alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.court_photos enable row level security;
alter table public.reviews enable row level security;

-- Profiles
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are readable by all'
  ) then
    execute 'create policy "Profiles are readable by all" on public.profiles for select using (true);';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can manage their profile'
  ) then
    execute 'create policy "Users can manage their profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);';
  end if;
end $$;

-- Courts
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'courts' and policyname = 'Courts are readable by all'
  ) then
    execute 'create policy "Courts are readable by all" on public.courts for select using (true);';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'courts' and policyname = 'Authenticated users can insert courts'
  ) then
    execute 'create policy "Authenticated users can insert courts" on public.courts for insert with check (auth.role() = ''authenticated'');';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'courts' and policyname = 'Creators can update their courts'
  ) then
    execute 'create policy "Creators can update their courts" on public.courts for update using (auth.uid() = created_by) with check (auth.uid() = created_by);';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'courts' and policyname = 'Creators can delete their courts'
  ) then
    execute 'create policy "Creators can delete their courts" on public.courts for delete using (auth.uid() = created_by);';
  end if;
end $$;

-- Court photos
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'court_photos' and policyname = 'Court photos are readable by all'
  ) then
    execute 'create policy "Court photos are readable by all" on public.court_photos for select using (true);';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'court_photos' and policyname = 'Authenticated users can insert photos'
  ) then
    execute 'create policy "Authenticated users can insert photos" on public.court_photos for insert with check (auth.role() = ''authenticated'');';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'court_photos' and policyname = 'Uploaders can modify photos'
  ) then
    execute 'create policy "Uploaders can modify photos" on public.court_photos for all using (auth.uid() = uploaded_by) with check (auth.uid() = uploaded_by);';
  end if;
end $$;

-- Reviews
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Reviews are readable by all'
  ) then
    execute 'create policy "Reviews are readable by all" on public.reviews for select using (true);';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Authenticated users can insert reviews'
  ) then
    execute 'create policy "Authenticated users can insert reviews" on public.reviews for insert with check (auth.role() = ''authenticated'');';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Authors can modify their reviews'
  ) then
    execute 'create policy "Authors can modify their reviews" on public.reviews for all using (auth.uid() = author_id) with check (auth.uid() = author_id);';
  end if;
end $$;

-- Optional helper to ensure created_at/updated_at are set
create or replace function public.handle_new_profile() returns trigger as $$
begin
  new.created_at := timezone('utc', now());
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;
