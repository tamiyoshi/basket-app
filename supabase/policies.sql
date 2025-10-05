-- Row-Level Security policies for HoopSpotter
-- Execute after schema.sql has been applied

alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.court_photos enable row level security;
alter table public.reviews enable row level security;

-- Profiles: users can view all, update only their record
create policy if not exists "Profiles are readable by all" on public.profiles
  for select using (true);

create policy if not exists "Users can manage their profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Courts: anyone can read, authenticated users can insert/update own entries
create policy if not exists "Courts are readable by all" on public.courts
  for select using (true);

create policy if not exists "Authenticated users can insert courts" on public.courts
  for insert with check (auth.role() = 'authenticated');

create policy if not exists "Creators can update their courts" on public.courts
  for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy if not exists "Creators can delete their courts" on public.courts
  for delete using (auth.uid() = created_by);

-- Court photos: anyone can read (public bucket), uploader manages their photo
create policy if not exists "Court photos are readable by all" on public.court_photos
  for select using (true);

create policy if not exists "Authenticated users can insert photos" on public.court_photos
  for insert with check (auth.role() = 'authenticated');

create policy if not exists "Uploaders can modify photos" on public.court_photos
  for all using (auth.uid() = uploaded_by)
  with check (auth.uid() = uploaded_by);

-- Reviews: anyone can read, author manages own review
create policy if not exists "Reviews are readable by all" on public.reviews
  for select using (true);

create policy if not exists "Authenticated users can insert reviews" on public.reviews
  for insert with check (auth.role() = 'authenticated');

create policy if not exists "Authors can modify their reviews" on public.reviews
  for all using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Optional helper to ensure created_by / uploaded_by / author_id default to auth.uid()
create function public.handle_new_profile() returns trigger as $$
begin
  new.created_at := timezone('utc', now());
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Trigger examples (optional, ensure they exist before creating)
-- create trigger set_courts_timestamps before insert or update on public.courts
--   for each row execute procedure public.set_timestamp();
