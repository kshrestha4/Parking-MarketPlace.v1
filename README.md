# Parking Marketplace

A parking-space marketplace where people can list unused parking spaces and
drivers can find, compare, and reserve them.

We're building it in small milestones so the foundation lands clean and each
feature has tests behind it before we move on.

## What's here so far

- Next.js 16 (App Router) + React + TypeScript + Tailwind CSS
- A landing page with clear "find parking" / "list your space" entry points
- Site header/footer and routes for search, host, and sign-in
- PostgreSQL + PostGIS schema as versioned migrations
- **Supabase authentication** for customers, owners, and admins
- **Owner parking listing workflow** (create, save draft, submit, approve)
- **Reservations** with database-level double-booking protection
- ESLint, TypeScript, and Vitest ready

## Authentication

Auth uses Supabase, wired up through `@supabase/ssr`. Sessions are stored in
the cookies and kept fresh by a Next.js `proxy` (the current replacement for
middleware in Next 16). Pages read the signed-in user server-side and enforce
roles from the database before rendering anything protected.

What's covered:

- Customer and owner registration + login/logout
- Protected, role-gated pages (`/dashboard`, `/dashboard/host`, `/admin`)
- An `/unauthorized` page and an `/auth/callback` route for email confirmation
- Server-side validation and friendly error messages

The important rule: a user's role is *never* trusted from the browser. Roles
live in the `profiles` table and are set on the server at signup. A database
trigger prevents anyone from changing their own role; only the service role
can promote an account.

## Owner parking listings

Owners add parking spaces from their dashboard. A listing can be saved as a
draft and submitted later, or submitted directly for review. Administrators
approve or reject it; only *approved* listings are visible to customers, and
that's enforced by the database (row-level security), not just the UI.

A listing is created through a `save_listing` database function so the listing
and its availability, pricing, and blackout dates are written atomically, and
so the PostGIS point is built with `ST_MakePoint` rather than massaged in the
client. Ownership is checked by both the server action and the function itself;
changing the listing id in the URL can't get you access to someone else's
listing.

Photos upload to Supabase Storage as `parking-images`; until storage is wired
up, the form notes that uploads aren't active rather than pretending they
succeeded.

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

## Reservations

Customers book parking from the listing page: pick a date, start time, and end
time, see a live price estimate, and reserve. Booking is validated twice — the
server action checks the window, then `create_reservation()` in the database
checks the lot's weekly hours and blackout dates, computes the authoritative
price (hourly rate × duration + platform fee), and inserts the reservation.

The final guarantee against double booking is a GiST exclusion constraint on
`reservations` that refuses any row overlapping an existing one on the same
lot, so even two requests racing each other can't both succeed.

Customers manage bookings under `/dashboard/reservations` (upcoming, past,
cancel). Owners see who booked their spaces under `/dashboard/host/reservations`.

Pricing is stored in cents and calculated server-side only; the client shows an
estimate from the same formula. A booking must fit inside a single weekly open
window — overnight multi-day bookings aren't supported yet.

## Parking map

The customer map is built with [MapLibre GL JS](https://maplibre.org/). MapLibre
renders tiles but doesn't serve them, so a separate tile/style provider is
involved. It defaults to [OpenFreeMap](https://openfreemap.org/) — free,
keyless, and license-friendly — which is fine for local development. For
production, point `NEXT_PUBLIC_MAP_STYLE_URL` at a commercial provider (e.g.
MapTiler) that meets your needs.

Approved parking is stored as PostGIS `geography(Point, 4326)` with a GiST
index. Search runs server-side through a `search_parking` database function:
the browser sends a lat/lng/radius, PostGIS filters and measures distances,
and only approved lots within the radius come back ordered by distance. The
frontend never fetches every lot to sort them in JavaScript.

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

Copy `.env.example` to `.env.local` and fill in real values. Secrets are never
committed.

The app runs (and degrades gracefully) without auth configured, but to actually
sign in you need a Supabase project and these variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # the anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=             # server-only, for signup/role/admin
```

In your Supabase project, set the site URL and add a redirect URL pointing at
`/auth/callback` so email confirmation resolves. Apply the migrations to the
project first (they're in `supabase/migrations/`).

## Project structure

```
src/
  app/            # App Router pages and route handlers
    page.tsx      # landing page
    login/, signup/        # auth
    auth/actions.ts        # signup/login/logout server actions
    auth/callback/route.ts # email-confirmation code exchange
    dashboard/             # customer dashboard (role-gated)
    dashboard/host/        # owner dashboard + listing workflows (role-gated)
    admin/                 # admin approval dashboard (role-gated)
    unauthorized/          # 401 page
  lib/
    supabase/              # client/server/admin/proxy Supabase clients + config
    auth.ts                # getCurrentUser / requireUser / requireRole
    validation.ts          # server-side form validation
  components/     # shared UI (header, footer, setup notice)
```

## Roadmap

We're building toward a deployable MVP in this order:

1. Clean foundation ✅
2. Database schema + PostGIS ✅
3. Authentication (customer / owner / admin) ✅
4. Owner parking listings ✅
5. Map + geospatial search ✅
6. Customer parking search and filters ✅
7. Reservations and availability (with double-booking protection) ✅
8. Stripe Connect payments and owner payouts
9. Reviews and notifications
10. End-to-end tests, security pass, deployment docs
