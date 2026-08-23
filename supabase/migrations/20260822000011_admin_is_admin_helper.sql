-- The old admin checks did `exists(select ... from profiles ...)` inside
-- profiles' own SELECT policy, which made Postgres recurse until it gave up.
-- Pull the check into a security definer function: it bypasses RLS on the
-- profiles read it performs, so no recursion, while still answering truthfully
-- about whether the calling user is an admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Grant everyone execute; the function only reveals whether the caller is an
-- admin, so broad execute access is fine.
grant execute on function public.is_admin() to public;

alter table public.profiles disable row level security;
alter table public.profiles enable row level security;

drop policy "admins can read all profiles" on public.profiles;
create policy "admins can read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy "admins can view all parking" on public.parking_lots;
create policy "admins can view all parking" on public.parking_lots
  for select using (public.is_admin());

drop policy "admins can update any parking" on public.parking_lots;
create policy "admins can update any parking" on public.parking_lots
  for update using (public.is_admin());

drop policy "admins can manage any parking image" on public.parking_images;
create policy "admins can manage any parking image" on public.parking_images
  for all using (public.is_admin());

drop policy "admins can manage any availability" on public.parking_availability;
create policy "admins can manage any availability" on public.parking_availability
  for all using (public.is_admin());

drop policy "admins can manage any pricing" on public.parking_pricing;
create policy "admins can manage any pricing" on public.parking_pricing
  for all using (public.is_admin());

drop policy "admins can manage any blackout dates" on public.parking_blackout_dates;
create policy "admins can manage any blackout dates" on public.parking_blackout_dates
  for all using (public.is_admin());

drop policy "admins can view all reservations" on public.reservations;
create policy "admins can view all reservations" on public.reservations
  for select using (public.is_admin());

drop policy "admins can update any reservation" on public.reservations;
create policy "admins can update any reservation" on public.reservations
  for update using (public.is_admin());

drop policy "admins can moderate reviews" on public.reviews;
create policy "admins can moderate reviews" on public.reviews
  for delete using (public.is_admin());
