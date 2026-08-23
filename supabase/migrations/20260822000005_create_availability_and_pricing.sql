-- Recurring weekly open slots. A lot is open during every listed
-- day/time window; one 24/7 lot just has a full week of rows.
create table public.parking_availability (
  id uuid primary key default gen_random_uuid(),
  parking_lot_id uuid not null references public.parking_lots (id) on delete cascade,
  -- 0 = Sunday, 6 = Saturday (Postgres ISODOW style)
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  check (close_time > open_time)
);

create index parking_availability_lot_idx on public.parking_availability (parking_lot_id);

-- Simple hourly pricing, kept in cents. One row per lot for MVP; the table
-- shape leaves room for season/time-based pricing later without a migration
-- that tears everything down.
create table public.parking_pricing (
  id uuid primary key default gen_random_uuid(),
  parking_lot_id uuid not null references public.parking_lots (id) on delete cascade,
  price_per_hour_cents integer not null check (price_per_hour_cents >= 0),
  currency char(3) not null default 'USD',
  platform_fee_percent numeric(5, 2) not null default 10.00
    check (platform_fee_percent >= 0 and platform_fee_percent <= 100),
  updated_at timestamptz not null default now()
);

create unique index parking_pricing_lot_unique on public.parking_pricing (parking_lot_id);

alter table public.parking_availability enable row level security;
alter table public.parking_pricing enable row level security;

-- Availability and pricing are helpers of a listing, so they follow the same
-- owner/admin manage + anyone can read approved rule as the parking lot itself.

create policy "anyone can view availability of approved parking"
  on public.parking_availability for select
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.status = 'approved'
  ));

create policy "owners can manage own availability"
  on public.parking_availability for all
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.owner_id = auth.uid()
  ));

create policy "anyone can view pricing of approved parking"
  on public.parking_pricing for select
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.status = 'approved'
  ));

create policy "owners can manage own pricing"
  on public.parking_pricing for all
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.owner_id = auth.uid()
  ));

create policy "admins can manage any availability"
  on public.parking_availability for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admins can manage any pricing"
  on public.parking_pricing for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
