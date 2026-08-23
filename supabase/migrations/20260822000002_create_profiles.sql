-- One row per user, keyed by the auth user id. Holds the role that decides
-- which parts of the app a user can reach.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'customer'
    check (role in ('customer', 'owner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create a profile row automatically when someone signs up.
-- Admin is never set here; it has to be granted deliberately afterwards.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "admins can read all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid());
