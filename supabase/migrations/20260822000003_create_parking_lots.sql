-- A parking listing. Stores its location as a PostGIS geography point so
-- radius searches can run in the database instead of in JavaScript.
create table public.parking_lots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  parking_type text not null
    check (parking_type in ('street', 'lot', 'garage', 'driveway')),
  address text not null,
  location geography(Point, 4326) not null,
  spaces_count integer not null default 1 check (spaces_count >= 1),
  rules text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GiST index so "parking within X meters" stays fast as listings grow.
create index parking_lots_location_idx on public.parking_lots using gist (location);
create index parking_lots_owner_idx on public.parking_lots (owner_id);
create index parking_lots_status_idx on public.parking_lots (status);

alter table public.parking_lots enable row level security;

-- Customers can only see approved listings. Owner and admin see everything
-- relevant to them below.
create policy "anyone can view approved parking"
  on public.parking_lots for select
  using (status = 'approved');

create policy "owners can view own parking"
  on public.parking_lots for select
  using (auth.uid() = owner_id);

create policy "admins can view all parking"
  on public.parking_lots for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- New listings always start as pending and wait for admin approval.
create policy "owners can create pending parking"
  on public.parking_lots for insert
  with check (owner_id = auth.uid() and status = 'pending');

create policy "owners can update own parking"
  on public.parking_lots for update
  using (auth.uid() = owner_id);

create policy "admins can update any parking"
  on public.parking_lots for update
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "owners can delete own parking"
  on public.parking_lots for delete
  using (auth.uid() = owner_id);
