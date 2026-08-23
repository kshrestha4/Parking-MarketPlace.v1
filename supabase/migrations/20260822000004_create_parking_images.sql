-- Photos for a listing. Files live in object storage; this table only records
-- the path so we don't bloat the database with image data.
create table public.parking_images (
  id uuid primary key default gen_random_uuid(),
  parking_lot_id uuid not null references public.parking_lots (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index parking_images_lot_idx on public.parking_images (parking_lot_id);

alter table public.parking_images enable row level security;

-- Images are only shown next to approved listings, so the same visibility rule
-- as the lot itself.
create policy "anyone can view images of approved parking"
  on public.parking_images for select
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.status = 'approved'
  ));

create policy "owners can manage own parking images"
  on public.parking_images for all
  using (exists (
    select 1 from public.parking_lots l
    where l.id = parking_lot_id and l.owner_id = auth.uid()
  ));

create policy "admins can manage any parking image"
  on public.parking_images for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
