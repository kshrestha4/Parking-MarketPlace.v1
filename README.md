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
