-- Reservation creation and cancellation as database functions. The browser
-- never inserts into reservations directly; these functions validate the
-- booking window against the lot's weekly schedule and blackout dates, compute
-- the price server-side, and rely on the exclusion constraint as the final
-- protection against double booking.

-- MVP rule: a booking has to fit inside a single weekly open window. No
-- overnight multi-day bookings yet. The listing form already enforces
-- close_time > open_time, so windows never span midnight.
create or replace function public.create_reservation(
  p_lot_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_lot parking_lots%rowtype;
  v_price parking_pricing%rowtype;
  v_minutes double precision;
  v_total_cents integer;
  v_fee_cents integer;
  v_reservation_id uuid;
begin
  if v_caller_id is null then
    raise exception 'you must be signed in to reserve parking';
  end if;

  if not exists (
    select 1 from profiles pr
    where pr.id = v_caller_id and pr.role in ('customer', 'owner')
  ) then
    raise exception 'only customers can reserve parking';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'the booking must end after it starts';
  end if;

  if extract(epoch from (p_ends_at - p_starts_at)) / 60 < 30 then
    raise exception 'bookings must be at least 30 minutes';
  end if;

  if p_starts_at::date <> p_ends_at::date then
    raise exception 'bookings must start and end on the same day for now';
  end if;

  select * into v_lot from parking_lots where id = p_lot_id;
  if not found then
    raise exception 'that parking listing does not exist';
  end if;
  if v_lot.status <> 'approved' then
    raise exception 'that listing is not available';
  end if;

  -- The whole window has to sit inside one weekly open slot on that weekday.
  -- extract(dow) matches the listing form's day numbering: 0 = Sunday.
  if not exists (
    select 1 from parking_availability a
    where a.parking_lot_id = p_lot_id
      and a.day_of_week = extract(dow from p_starts_at)
      and a.open_time <= p_starts_at::time
      and a.close_time >= p_ends_at::time
  ) then
    raise exception 'the parking is not open at that time';
  end if;

  if exists (
    select 1 from parking_blackout_dates b
    where b.parking_lot_id = p_lot_id and b.date = p_starts_at::date
  ) then
    raise exception 'the parking is unavailable on that date';
  end if;

  select * into v_price from parking_pricing where parking_lot_id = p_lot_id;
  if not found then
    raise exception 'this listing has no price set';
  end if;

  -- Authoritative price: per-minute proration of the hourly rate, plus the
  -- platform's cut. The client only ever displays an estimate.
  v_minutes := extract(epoch from (p_ends_at - p_starts_at)) / 60;
  v_total_cents := round(v_price.price_per_hour_cents * v_minutes / 60.0)::integer;
  v_fee_cents := round(v_total_cents * v_price.platform_fee_percent / 100.0)::integer;

  insert into reservations (
    parking_lot_id, customer_id, starts_at, ends_at, status,
    total_cents, platform_fee_cents, owner_payout_cents
  )
  values (
    p_lot_id, v_caller_id, p_starts_at, p_ends_at, 'pending',
    v_total_cents, v_fee_cents, v_total_cents - v_fee_cents
  )
  returning id into v_reservation_id;

  return v_reservation_id;
exception
  -- The GiST exclusion constraint refused an overlapping booking.
  when exclusion_violation then
    raise exception 'that time slot was just booked by someone else';
end;
$$;

-- Customers cancel their own bookings; owners can cancel bookings on their own
-- lots; admins can cancel anything. Refunds are a payment concern and are not
-- part of this function.
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_reservation reservations%rowtype;
  v_is_admin boolean;
begin
  if v_caller_id is null then
    raise exception 'you must be signed in';
  end if;

  select * into v_reservation from reservations where id = p_reservation_id;
  if not found then
    raise exception 'reservation not found';
  end if;

  select exists(
    select 1 from profiles pr where pr.id = v_caller_id and pr.role = 'admin'
  ) into v_is_admin;

  if v_reservation.customer_id <> v_caller_id
     and not v_is_admin
     and not exists (
       select 1 from parking_lots l
       where l.id = v_reservation.parking_lot_id and l.owner_id = v_caller_id
     ) then
    raise exception 'you cannot cancel this reservation';
  end if;

  if v_reservation.status not in ('pending', 'payment_pending', 'confirmed') then
    raise exception 'this reservation cannot be cancelled anymore';
  end if;

  update reservations set status = 'cancelled' where id = p_reservation_id;
end;
$$;

grant execute on function public.create_reservation(uuid, timestamptz, timestamptz) to public;
grant execute on function public.cancel_reservation(uuid) to public;
