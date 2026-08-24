import type { Metadata } from "next";
import Link from "next/link";

import { cancelReservation } from "@/app/reservations/actions";
import { requireRole } from "@/lib/auth";
import { centsToDollars } from "@/lib/listings";
import {
  isCancellable,
  RESERVATION_STATUS_LABELS,
} from "@/lib/reservations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your reservations",
};

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

interface ReservationRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  total_cents: number;
  parking_lots: { id: string; name: string } | null;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; cancelled?: string }>;
}) {
  const { user } = await requireRole(["customer"]);
  const params = await searchParams;

  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("reservations")
        .select("id, starts_at, ends_at, status, total_cents, parking_lots(id, name)")
        .eq("customer_id", user.id)
        .order("starts_at", { ascending: false })
    : { data: null };

  // supabase-js can't infer the embedded parking_lots shape without generated
  // types, so the rows are normalized here.
  const rows = (data ?? []) as unknown as ReservationRow[];
  const now = new Date();

  const upcoming = rows.filter(
    (r) => new Date(r.starts_at) >= now || isCancellable(r.status),
  );
  const past = rows.filter((r) => !upcoming.includes(r));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your reservations</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Upcoming and past bookings at a glance.
      </p>

      {params.created && (
        <p className="mt-6 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Reservation created. We&apos;ll confirm it once payment is arranged.
        </p>
      )}
      {params.cancelled && (
        <p className="mt-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Reservation cancelled.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-white/15 p-10 text-center">
          <h2 className="font-medium">No reservations yet</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Find parking on the map and book your first spot.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Find parking
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Upcoming
              </h2>
              <ul className="mt-3 space-y-3">
                {upcoming.map((r) => (
                  <ReservationCard key={r.id} reservation={r} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Past
              </h2>
              <ul className="mt-3 space-y-3">
                {past.map((r) => (
                  <ReservationCard key={r.id} reservation={r} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: ReservationRow }) {
  const lot = reservation.parking_lots;
  const statusLabel =
    RESERVATION_STATUS_LABELS[reservation.status as keyof typeof RESERVATION_STATUS_LABELS] ??
    reservation.status;

  return (
    <li className="rounded-md border border-white/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-medium">
              {lot ? (
                <Link href={`/parking/${lot.id}`} className="hover:underline">
                  {lot.name}
                </Link>
              ) : (
                "Parking"
              )}
            </h3>
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-zinc-300">
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {formatWindow(reservation.starts_at, reservation.ends_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {centsToDollars(reservation.total_cents).toFixed(2)} USD
          </p>
          {isCancellable(reservation.status) && (
            <form action={cancelReservation}>
              <input
                type="hidden"
                name="reservationId"
                value={reservation.id}
              />
              <button
                type="submit"
                className="mt-2 text-xs text-zinc-400 underline-offset-2 transition-colors hover:text-red-300 hover:underline"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
