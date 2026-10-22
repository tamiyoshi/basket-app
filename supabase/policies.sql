-- Row-Level Security policies for HoopSpotter
-- Execute after schema.sql has been applied

alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.court_photos enable row level security;
alter table public.reviews enable row level security;

-- Profiles
drop policy if exists "Profiles are readable by all" on public.profiles;
create policy "Profiles are readable by all" on public.profiles for select using (true);

drop policy if exists "Users can manage their profile" on public.profiles;
drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile" on public.profiles
  for insert with check (auth.uid() = id and role = 'user'::user_role);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Courts
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'courts' and policyname = 'Courts are readable by all'
  ) then
    execute 'create policy "Courts are readable by all" on public.courts for select using (true);';
  end if;

  execute 'drop policy if exists "Authenticated users can insert courts" on public.courts;';
  execute 'create policy "Authenticated users can insert courts" on public.courts for insert with check (auth.uid() = created_by);';

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

  execute 'drop policy if exists "Authenticated users can insert photos" on public.court_photos;';
  execute 'create policy "Authenticated users can insert photos" on public.court_photos for insert with check (auth.uid() = uploaded_by);';

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

  execute 'drop policy if exists "Authenticated users can insert reviews" on public.reviews;';
  execute 'create policy "Authenticated users can insert reviews" on public.reviews for insert with check (auth.uid() = author_id);';

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Authors can modify their reviews'
  ) then
    execute 'create policy "Authors can modify their reviews" on public.reviews for all using (auth.uid() = author_id) with check (auth.uid() = author_id);';
  end if;
end $$;
