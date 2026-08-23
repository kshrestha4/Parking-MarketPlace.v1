-- Saves a listing and everything that belongs to it in one transaction. Doing
-- this as a database function keeps the parking_lots insert and its child rows
-- atomic, and lets us build the PostGIS point with ST_MakePoint instead of
-- wrangling the geography type from the JS client.
--
-- Only the profile owner (or an admin) can save; p_owner_id must match the
-- caller's auth.uid(). The browser never picks the owner.
create or replace function public.save_listing(
  p_lot_id uuid,
  p_owner_id uuid,
  p_name text,
  p_description text,
  p_parking_type text,
  p_spaces_count integer,
  p_vehicle_types text[],
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_rules text,
  p_status text,
  p_hourly_rate_cents integer,
  p_currency char(3),
  p_availability jsonb,
  p_blackout_dates date[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid := p_lot_id;
begin
  if not exists (
    select 1 from profiles pr
    where pr.id = auth.uid() and pr.role in ('owner', 'admin')
  ) then
    raise exception 'only owners can save listings';
  end if;

  if p_owner_id <> auth.uid() and not exists (
    select 1 from profiles pr where pr.id = auth.uid() and pr.role = 'admin'
  ) then
    raise exception 'cannot save a listing for another user';
  end if;

  if p_lot_id is null then
    insert into parking_lots (
      owner_id, name, description, parking_type, spaces_count, vehicle_types,
      address, location, rules, status
    )
    values (
      p_owner_id, p_name, p_description, p_parking_type, p_spaces_count,
      p_vehicle_types, p_address,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_rules,
      case when p_status in ('draft', 'pending') then p_status else 'draft' end
    )
    returning id into v_lot_id;
  else
    update parking_lots
    set name = p_name,
        description = p_description,
        parking_type = p_parking_type,
        spaces_count = p_spaces_count,
        vehicle_types = p_vehicle_types,
        address = p_address,
        location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        rules = p_rules,
        status = case when p_status in ('draft', 'pending', 'approved', 'rejected', 'suspended')
                      then p_status else status end,
        updated_at = now()
    where id = p_lot_id and owner_id = p_owner_id;
    if not found then
      raise exception 'listing not found or not owned by you';
    end if;
  end if;

  -- Replace the availability rows wholesale. Cheaper and simpler than diffing.
  delete from parking_availability where parking_lot_id = v_lot_id;
  insert into parking_availability (parking_lot_id, day_of_week, open_time, close_time)
  select v_lot_id,
         (entry ->> 'day_of_week')::smallint,
         (entry ->> 'open_time')::time,
         (entry ->> 'close_time')::time
  from jsonb_array_elements(p_availability) as entry;

  insert into parking_pricing (parking_lot_id, price_per_hour_cents, currency)
  values (v_lot_id, p_hourly_rate_cents, p_currency)
  on conflict (parking_lot_id) do update set
    price_per_hour_cents = excluded.price_per_hour_cents,
    currency = excluded.currency,
    updated_at = now();

  delete from parking_blackout_dates where parking_lot_id = v_lot_id;
  insert into parking_blackout_dates (parking_lot_id, date)
  select v_lot_id, d from unnest(p_blackout_dates) as d;

  return v_lot_id;
end;
$$;
