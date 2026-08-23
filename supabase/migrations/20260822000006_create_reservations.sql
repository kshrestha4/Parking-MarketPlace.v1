create type public.reservation_status as enum (
  'pending',
  'payment_pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'expired',
  'failed',
  'refunded'
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  parking_lot_id uuid not null references public.parking_lots (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.reservation_status not null default 'pending',
  total_cents integer not null check (total_cents >= 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  owner_payout_cents integer not null default 0 check (owner_payout_cents >= 0),
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index reservations_lot_idx on public.reservations (parking_lot_id);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_time_idx on public.reservations (starts_at);

-- The real double-booking guard lives in the database, not the app. The
-- GiST exclusion constraint refuses any reservation that overlaps an existing
-- one on the same lot. Held states block rebooking; finished or failed states
-- do not, so a cancelled spot can be rebooked right away.
alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    parking_lot_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status in ('pending', 'payment_pending', 'confirmed', 'active'));

alter table public.reservations enable row level security;

create policy "customers can view own reservations"
  on public.reservations for select
  using (auth.uid() = customer_id);

create policy "owners can view reservations on own parking"
  on public.reservations for select
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.owner_id = auth.uid()
  ));

create policy "admins can view all reservations"
  on public.reservations for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "customers can create pending reservations"
  on public.reservations for insert
  with check (auth.uid() = customer_id and status = 'pending');

-- Owners and admins need to move reservations between states (confirm, cancel).
create policy "owners can update reservations on own parking"
  on public.reservations for update
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.owner_id = auth.uid()
  ));

create policy "admins can update any reservation"
  on public.reservations for update
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
