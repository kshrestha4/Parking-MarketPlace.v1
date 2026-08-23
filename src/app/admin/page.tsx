import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingStatusBadge } from "@/components/listing-status-badge";
import { reviewListing } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const { profile } = await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: lots } = supabase
    ? await supabase
        .from("parking_lots")
        .select("id, name, parking_type, address, spaces_count, status, status_reason")
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; name: string; parking_type: string; address: string; spaces_count: number; status: string; status_reason: string | null }[] };

  const pending = (lots ?? []).filter((l) => l.status === "pending");
  const reviewed = (lots ?? []).filter((l) => l.status !== "pending");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-zinc-400">Signed in as {profile?.full_name}.</p>

      {!supabase && (
        <p className="mt-6 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
          Connect Supabase to review listings.
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Pending approval</h2>
        {supabase && pending.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No listings waiting on you.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((lot) => (
              <li key={lot.id} className="rounded-md border border-amber-500/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{lot.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {lot.parking_type} · {lot.spaces_count} spaces · {lot.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <form
                      action={async () => {
                        "use server";
                        await reviewListing(lot.id, "approved");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
                      >
                        Approve
                      </button>
                    </form>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const reason = String(formData.get("reason") ?? "");
                        await reviewListing(lot.id, "rejected", reason);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          name="reason"
                          placeholder="Reason (optional)"
                          className="w-40 rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-white/40"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-red-500/50 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
                        >
                          Reject
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">All listings</h2>
        <ul className="mt-4 space-y-2">
          {reviewed.map((lot) => (
            <li
              key={lot.id}
              className="flex items-center justify-between rounded-md border border-white/10 p-3"
            >
              <div>
                <span className="font-medium">{lot.name}</span>
                <span className="ml-3 text-sm text-zinc-500">{lot.parking_type}</span>
                {lot.status_reason && (
                  <span className="ml-3 text-sm text-zinc-500">({lot.status_reason})</span>
                )}
              </div>
              <ListingStatusBadge status={lot.status} />
            </li>
          ))}
          {reviewed.length === 0 && (
            <p className="text-sm text-zinc-500">Nothing here yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
