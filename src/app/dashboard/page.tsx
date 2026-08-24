import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Your dashboard",
};

export default async function CustomerDashboardPage() {
  // Only customers get this view. Owners and admins are sent away.
  const { profile } = await requireRole(["customer"]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back, {profile?.full_name}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        You can find parking, manage reservations, and leave reviews here.
      </p>

      <Link
        href="/dashboard/reservations"
        className="mt-10 flex items-center justify-between rounded-md border border-white/10 p-6 transition-colors hover:border-white/25"
      >
        <div>
          <h2 className="font-medium">Your reservations</h2>
          <p className="mt-2 text-sm text-zinc-400">
            View upcoming and past bookings, or cancel one.
          </p>
        </div>
        <span className="text-sm text-zinc-400">View →</span>
      </Link>
    </div>
  );
}
