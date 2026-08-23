import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingStatusBadge } from "@/components/listing-status-badge";

export const metadata: Metadata = {
  title: "Host dashboard",
};

export default async function HostDashboardPage() {
  const { user, profile } = await requireRole(["owner"]);

  const supabase = await createClient();
  const { data: lots } = supabase
    ? await supabase
        .from("parking_lots")
        .select("id, name, parking_type, spaces_count, status, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; name: string; parking_type: string; spaces_count: number; status: string; created_at: string }[] };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile?.full_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your parking spaces and see where they stand.
          </p>
        </div>
        <Link
          href="/dashboard/host/listings/new"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Add parking
        </Link>
      </div>

      {!supabase && (
        <p className="mt-6 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
          Connect Supabase to start listing parking spaces.
        </p>
      )}

      {supabase && lots!.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-white/15 p-10 text-center">
          <h2 className="font-medium">No parking listed yet</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Create your first listing and it will show up here.
          </p>
          <Link
            href="/dashboard/host/listings/new"
            className="mt-6 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium transition-colors hover:border-white/50"
          >
            Add parking
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {lots!.map((lot) => (
            <li
              key={lot.id}
              className="flex items-center justify-between rounded-md border border-white/10 p-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">{lot.name}</h3>
                  <ListingStatusBadge status={lot.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {lot.parking_type} · {lot.spaces_count} spaces
                </p>
              </div>
              <Link
                href={`/dashboard/host/listings/${lot.id}/edit`}
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
