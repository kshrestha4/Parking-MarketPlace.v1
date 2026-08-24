import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { centsToDollars } from "@/lib/listings";
import { RESERVATION_STATUS_LABELS } from "@/lib/reservations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your bookings",
};

interface Booking {
  id: string;
  parking_lot_id: string;
  lot_name: string;
  customer_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  total_cents: number;
  platform_fee_cents: number;
  owner_payout_cents: number;
  created_at: string;
}

function formatWindow(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time(start)}–${time(end)}`;
}

export default async function HostBookingsPage() {
  // owner_bookings() resolves the owner from the session, not a passed id.
  await requireRole(["owner"]);

  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.rpc("owner_bookings")
    : { data: null };

  const bookings = (data ?? []) as Booking[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Reservations on your parking, newest first.
          </p>
        </div>
        <Link
          href="/dashboard/host"
          className="text-sm text-zinc-400 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-white/15 p-10 text-center">
          <h2 className="font-medium">No bookings yet</h2>
          <p className="mt-2 text-sm text-zinc-400">
            When customers reserve your approved parking, the bookings show up
            here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {bookings.map((b) => {
            const statusLabel =
              RESERVATION_STATUS_LABELS[b.status as keyof typeof RESERVATION_STATUS_LABELS] ??
              b.status;
            return (
              <li
                key={b.id}
                className="rounded-md border border-white/10 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">
                        <Link
                          href={`/parking/${b.parking_lot_id}`}
                          className="hover:underline"
                        >
                          {b.lot_name}
                        </Link>
                      </h3>
                      <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-zinc-300">
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatWindow(b.starts_at, b.ends_at)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Booked by {b.customer_name}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {centsToDollars(b.total_cents).toFixed(2)} USD total
                    </p>
                    <p className="mt-1 text-zinc-400">
                      You earn {centsToDollars(b.owner_payout_cents).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
