-- Extend search_parking with optional price and type filters. The new params
-- are nullable: null means "don't filter on this". Lots without pricing are
-- excluded when a price filter is active (we can't confirm they fit).
drop function if exists public.search_parking(double precision, double precision, double precision);

create or replace function public.search_parking(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_min_price_cents integer default null,
  p_max_price_cents integer default null,
  p_parking_type text default null
)
returns table (
  id uuid,
  name text,
  parking_type text,
  address text,
  hourly_rate_cents integer,
  currency char(3),
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.parking_type,
    l.address,
    pr.price_per_hour_cents,
    pr.currency,
    ST_Y(l.location::geometry) as latitude,
    ST_X(l.location::geometry) as longitude,
    l.location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography as distance_m
  from parking_lots l
  left join parking_pricing pr on pr.parking_lot_id = l.id
  where l.status = 'approved'
    and ST_DWithin(
      l.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    and (p_min_price_cents is null or (pr.price_per_hour_cents is not null and pr.price_per_hour_cents >= p_min_price_cents))
    and (p_max_price_cents is null or (pr.price_per_hour_cents is not null and pr.price_per_hour_cents <= p_max_price_cents))
    and (p_parking_type is null or l.parking_type = p_parking_type)
  order by distance_m
  limit 200;
$$;

grant execute on function public.search_parking(double precision, double precision, double precision, integer, integer, text) to public;
