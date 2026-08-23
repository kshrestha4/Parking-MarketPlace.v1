-- Minimal stand-in for Supabase's auth schema so the migrations can be applied
-- and tested against a plain Postgres + PostGIS container locally.
--
-- This is NOT used in production. Supabase provides the real auth schema and
-- auth.uid() there. This file exists only so `npm run db:migrate` works against
-- the docker-compose database.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- Returns null locally. In Supabase this resolves to the signed-in user id.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select null::text;
$$;
