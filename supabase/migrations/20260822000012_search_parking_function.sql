-- Geospatial search: approved parking within a radius of a point, ordered by
-- distance. Radius is in meters (geography units). We return only the fields
-- the map needs and deliberately never leak the owner id or other private
-- columns. Approved-only is enforced here in SQL, not by the client.
create or replace function public.search_parking(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision
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
  order by distance_m
  limit 200;
$$;

grant execute on function public.search_parking(double precision, double precision, double precision) to public;
