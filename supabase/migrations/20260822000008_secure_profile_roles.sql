-- The role must never be settable from the browser. It's assigned at signup
-- (always 'customer' by default) and can only be changed deliberately with the
-- service role key, which is the one carrying the service_role JWT claim. This
-- trigger refuses any other role change, so a customer can't just flip to
-- 'admin' with a crafted update.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
begin
  if new.role is distinct from old.role
     and caller_role <> 'service_role'
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     ) then
    raise exception 'changing account role requires admin permissions';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_change();
