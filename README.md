# Parking Marketplace

A parking-space marketplace where people can list unused parking spaces and
drivers can find, compare, and reserve them.

We're building it in small milestones so the foundation lands clean and each
feature has tests behind it before we move on. This is the first milestone: a
Next.js app shell that runs locally and is wired up for the database and auth
work that's coming next.

## What's here so far

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- A landing page with clear "find parking" / "list your space" entry points
- Basic site header/footer and routes for search, host, and sign-in
- ESLint and TypeScript configured
- An `.env.example` documenting the variables we'll need

## How to run it

Prerequisites: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other useful commands:

```bash
npm run lint   # eslint
npm run build  # production build + type check
```

## Local database

The app uses PostgreSQL with PostGIS. Supabase is the production home for
Postgres; locally we run the same thing inside a Docker container so you can
apply and test migrations without a Supabase account. It listens on port 5433
to avoid clashing with any system Postgres already on 5432.

```bash
npm run db:up        # start the PostGIS container
npm run db:migrate   # apply every migration in supabase/migrations/
```

The schema lives as versioned SQL migrations in `supabase/migrations/`. Migrations
are applied in order by `scripts/db/migrate.sh`. A small `scripts/db/mock-auth.sql`
stands in for Supabase's `auth` schema so migrations run against local Postgres.

Key notes on the schema:

- Parking locations are PostGIS `geography(Point, 4326)` with a GiST index, so
  radius searches run in the database, not in JavaScript.
- Double booking is prevented at the database level with a GiST exclusion
  constraint on reservations, not just in the app.
- Row-level security is on for every table; owners and customers each only see
  and change the rows they're allowed to.

## Environment variables

There are no real environment variables yet — the app runs fine without any.
As we add auth, the database, payments, and maps, we'll need them. Copy
`.env.example` to `.env.local` and fill in values as features land. Secrets
are never committed.

## Project structure

```
src/
  app/            # App Router pages and route handlers
    page.tsx      # landing page
    search/       # customer search (coming)
    host/         # owner listing (coming)
    login/        # sign-in (coming)
  components/     # shared UI (header, footer)
```

## Roadmap

We're building toward a deployable MVP in this order:

1. Clean foundation (this milestone)
2. Database schema + PostGIS
3. Authentication (customer / owner / admin)
4. Owner parking listings
5. Map + geospatial search
6. Availability and reservations (with double-booking protection)
7. Stripe Connect payments and owner payouts
8. Admin dashboard
9. Reviews and notifications
10. End-to-end tests, security pass, deployment docs
