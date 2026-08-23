import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Host dashboard",
};

export default async function HostDashboardPage() {
  // Only owners get this view.
  const { profile } = await requireRole(["owner"]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back, {profile?.full_name}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Manage your parking listings, availability, pricing, and payouts here.
      </p>

      <div className="mt-10 rounded-md border border-white/10 p-6">
        <h2 className="font-medium">Your listings</h2>
        <p className="mt-2 text-sm text-zinc-400">
          The listing form is the next milestone in development. This iswhere your parking spaces will show up once they&apos;re approved.
        </p>
      </div>
    </div>
  );
}
