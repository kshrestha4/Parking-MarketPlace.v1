-- A review is tied to a single reservation so the same booking can't be
-- reviewed twice, and there's no way to review parking you never booked.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations (id) on delete cascade,
  parking_lot_id uuid not null references public.parking_lots (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_lot_idx on public.reviews (parking_lot_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read_at);

alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

create policy "anyone can view reviews"
  on public.reviews for select
  using (true);

create policy "customers can review own completed reservations"
  on public.reviews for insert
  with check (
    auth.uid() = customer_id and
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id
        and r.customer_id = auth.uid()
        and r.status = 'completed'
    )
  );

create policy "admins can moderate reviews"
  on public.reviews for delete
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "system can insert notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);
