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

-- Resolves the calling user from the request.jwt.claims setting. Supabase sets
-- this on every authenticated request; locally we set it before calling RPCs
-- or running queries so RLS behaves the same way.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb) ->> 'sub')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb) ->> 'role';
$$;
