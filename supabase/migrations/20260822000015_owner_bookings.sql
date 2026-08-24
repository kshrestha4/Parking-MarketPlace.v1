-- Bookings view for the owner dashboard. RLS lets owners see reservations on
-- their own lots, but not the customer's profile row, so this function runs as
-- the definer to join the customer name in. The owner_id check is explicit:
-- the caller can only ever see bookings for lots they own.
create or replace function public.owner_bookings()
returns table (
  id uuid,
  parking_lot_id uuid,
  lot_name text,
  customer_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  total_cents integer,
  platform_fee_cents integer,
  owner_payout_cents integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.parking_lot_id,
    l.name,
    p.full_name,
    r.starts_at,
    r.ends_at,
    r.status,
    r.total_cents,
    r.platform_fee_cents,
    r.owner_payout_cents,
    r.created_at
  from reservations r
  join parking_lots l on l.id = r.parking_lot_id
  join profiles p on p.id = r.customer_id
  where l.owner_id = auth.uid()
  order by r.starts_at desc;
$$;

grant execute on function public.owner_bookings() to public;
