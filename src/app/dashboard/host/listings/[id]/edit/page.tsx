import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { centsToDollars } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { ListingForm, type InitialListing } from "@/components/listing-form";

export const metadata: Metadata = {
  title: "Edit parking",
};

// The location column can come back as a GeoJSON object, a GeoJSON string, or
// an EWKT "POINT(lng lat)" string depending on the client. Handle all three.
function geoToLatLng(location: unknown): { latitude: number; longitude: number } {
  let geo = location;
  if (typeof geo === "string") {
    const trimmed = geo.trim();
    if (trimmed.startsWith("{")) {
      try {
        geo = JSON.parse(trimmed);
      } catch {
        /* fall through to EWKT handling */
      }
    }
    if (typeof geo === "string") {
      const match = trimmed.match(/POINT\(([-0-9.]+)\s+([-0-9.]+)\)/i);
      if (match) {
        return { longitude: Number(match[1]), latitude: Number(match[2]) };
      }
    }
  }
  if (geo && typeof geo === "object" && "coordinates" in (geo as Record<string, unknown>)) {
    const coords = (geo as { coordinates: number[] }).coordinates;
    return { longitude: coords[0], latitude: coords[1] };
  }
  return { latitude: 0, longitude: 0 };
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireRole(["owner"]);

  const supabase = await createClient();
  if (!supabase) notFound();

  const lotRes = await supabase
    .from("parking_lots")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (lotRes.error || !lotRes.data) notFound();

  const { latitude, longitude } = geoToLatLng(lotRes.data.location);

  const availRes = await supabase
    .from("parking_availability")
    .select("day_of_week, open_time, close_time")
    .eq("parking_lot_id", id);

  const priceRes = await supabase
    .from("parking_pricing")
    .select("price_per_hour_cents, currency")
    .eq("parking_lot_id", id)
    .single();

  const imagesRes = await supabase
    .from("parking_images")
    .select("storage_path")
    .eq("parking_lot_id", id)
    .order("position", { ascending: true });

  const initial: InitialListing = {
    id,
    name: lotRes.data.name,
    description: lotRes.data.description ?? "",
    parkingType: lotRes.data.parking_type,
    spacesCount: lotRes.data.spaces_count,
    vehicleTypes: lotRes.data.vehicle_types ?? [],
    address: lotRes.data.address,
    latitude,
    longitude,
    rules: lotRes.data.rules ?? "",
    hourlyRateDollars: centsToDollars(priceRes.data?.price_per_hour_cents ?? 0),
    currency: priceRes.data?.currency ?? "USD",
    availability: (availRes.data ?? []).map((slot) => ({
      dayOfWeek: slot.day_of_week,
      openTime: slot.open_time.slice(0, 5),
      closeTime: slot.close_time.slice(0, 5),
    })),
    blackoutDates: [],
    photoPaths: (imagesRes.data ?? []).map((img) => img.storage_path),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Edit parking</h1>
      <div className="mt-8">
        <ListingForm initial={initial} />
      </div>
    </div>
  );
}
