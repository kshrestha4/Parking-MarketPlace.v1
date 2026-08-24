import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BookingForm from "@/components/booking-form";
import { getCurrentUser } from "@/lib/auth";
import { centsToDollars } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Parking",
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function ParkingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  if (!supabase) notFound();

  // RLS only lets approved listings through here, so this page is unreachable
  // for pending, rejected, or suspended parking.
  const lotRes = await supabase.from("parking_lots").select("*").eq("id", id).single();
  if (lotRes.error || !lotRes.data) notFound();
  const lot = lotRes.data;

  const priceRes = await supabase
    .from("parking_pricing")
    .select("price_per_hour_cents, currency, platform_fee_percent")
    .eq("parking_lot_id", id)
    .single();

  const availRes = await supabase
    .from("parking_availability")
    .select("day_of_week, open_time, close_time")
    .eq("parking_lot_id", id)
    .order("day_of_week");

  const imagesRes = await supabase
    .from("parking_images")
    .select("storage_path")
    .eq("parking_lot_id", id)
    .order("position", { ascending: true });

  const hourly = centsToDollars(priceRes.data?.price_per_hour_cents ?? 0);
  const currency = priceRes.data?.currency ?? "USD";
  const platformFeePercent = priceRes.data?.platform_fee_percent ?? 10;

  const { user } = await getCurrentUser();

  let imageUrls: string[] = [];
  if (isSupabaseConfigured()) {
    imageUrls = (imagesRes.data ?? [])
      .map((img) => supabase.storage.from("parking-images").getPublicUrl(img.storage_path).data.publicUrl)
      .filter(Boolean);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/search"
        className="text-sm text-zinc-400 transition-colors hover:text-white"
      >
        ← Back to map
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{lot.name}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {lot.parking_type} · {lot.address}
      </p>

      {imageUrls.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imageUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${lot.name} photo ${i + 1}`}
              className="h-32 w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-md border border-white/10 p-5">
        <p className="text-sm text-zinc-400">Hourly rate</p>
        <p className="text-2xl font-semibold">
          {currency} {hourly.toFixed(2)}
        </p>
      </div>

      <BookingForm
        lotId={lot.id}
        hourlyRateCents={priceRes.data?.price_per_hour_cents ?? 0}
        platformFeePercent={platformFeePercent}
        currency={currency}
        signedIn={Boolean(user)}
      />

      {lot.description && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-2 text-sm text-zinc-400">{lot.description}</p>
        </section>
      )}

      {(lot.vehicle_types?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Vehicles accepted</h2>
          <p className="mt-2 text-sm text-zinc-400">{lot.vehicle_types.join(", ")}</p>
        </section>
      )}

      {lot.spaces_count > 1 && (
        <p className="mt-6 text-sm text-zinc-400">
          {lot.spaces_count} spaces available.
        </p>
      )}

      {availRes.data && availRes.data.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Hours</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {availRes.data.map((slot, i) => (
              <li key={i}>
                {DAY_LABELS[slot.day_of_week]}: {slot.open_time.slice(0, 5)}–
                {slot.close_time.slice(0, 5)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lot.rules && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Rules</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-zinc-400">{lot.rules}</p>
        </section>
      )}
    </div>
  );
}
