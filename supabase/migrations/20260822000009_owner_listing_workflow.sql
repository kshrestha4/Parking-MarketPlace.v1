-- Extend the listing status so owners can keep a draft before submitting.
alter table public.parking_lots
  drop constraint parking_lots_status_check,
  add constraint parking_lots_status_check
    check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended'));

-- Which kinds of vehicle fit the space (car, motorcycle, van, ...).
alter table public.parking_lots
  add column vehicle_types text[] not null default '{}';

-- Drafts and pending listings are both created by the owner; drafts just
-- haven't been submitted for review yet.
drop policy "owners can create pending parking" on public.parking_lots;
create policy "owners can create own parking" on public.parking_lots
  for insert
  with check (owner_id = auth.uid() and status in ('draft', 'pending'));

-- Occasional dates the space is not available, regardless of the usual weekly
-- schedule.
create table public.parking_blackout_dates (
  id uuid primary key default gen_random_uuid(),
  parking_lot_id uuid not null references public.parking_lots (id) on delete cascade,
  date date not null,
  unique (parking_lot_id, date)
);

create index parking_blackout_dates_lot_idx
  on public.parking_blackout_dates (parking_lot_id);

alter table public.parking_blackout_dates enable row level security;

create policy "owners can manage own blackout dates"
  on public.parking_blackout_dates for all
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.owner_id = auth.uid()
  ));

create policy "admins can manage any blackout dates"
  on public.parking_blackout_dates for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
