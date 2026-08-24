"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createReservation } from "@/app/reservations/actions";
import { estimatePrice } from "@/lib/pricing";

interface BookingFormProps {
  lotId: string;
  hourlyRateCents: number;
  platformFeePercent: number;
  currency: string;
  signedIn: boolean;
}

function formatCurrency(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function BookingForm({
  lotId,
  hourlyRateCents,
  platformFeePercent,
  currency,
  signedIn,
}: BookingFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [state, formAction, pending] = useActionState(createReservation, {
    error: null,
    message: null,
  });

  // Display-only estimate. The database computes the real total on booking.
  const estimate =
    date && startTime && endTime
      ? estimatePrice(
          hourlyRateCents,
          platformFeePercent,
          `${date}T${startTime}`,
          `${date}T${endTime}`,
        )
      : null;

  const today = new Date().toISOString().slice(0, 10);

  if (!signedIn) {
    return (
      <div className="mt-6 rounded-md border border-white/10 p-5">
        <p className="text-sm text-zinc-400">
          Sign in to reserve this parking.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 rounded-md border border-white/10 p-5">
      <input type="hidden" name="lotId" value={lotId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm text-zinc-400">Date</span>
          <input
            type="date"
            name="date"
            min={today}
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-400">Start time</span>
          <input
            type="time"
            name="startTime"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-400">End time</span>
          <input
            type="time"
            name="endTime"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Bookings must fit within the lot&apos;s open hours listed above.
      </p>

      {estimate && (
        <div className="mt-4 rounded-md bg-zinc-900 p-4 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>
              {estimate.durationMinutes >= 60
                ? `${Math.floor(estimate.durationMinutes / 60)}h ${estimate.durationMinutes % 60}m`
                : `${estimate.durationMinutes}m`}{" "}
              at {formatCurrency(hourlyRateCents, currency)}/hr
            </span>
            <span>{formatCurrency(estimate.totalCents, currency)}</span>
          </div>
          <div className="mt-1 flex justify-between text-zinc-500">
            <span>Platform fee</span>
            <span>{formatCurrency(estimate.platformFeeCents, currency)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-medium text-white">
            <span>Total</span>
            <span>{formatCurrency(estimate.totalCents, currency)}</span>
          </div>
        </div>
      )}

      {state.error && (
        <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Reserving…" : "Reserve"}
      </button>
    </form>
  );
}
