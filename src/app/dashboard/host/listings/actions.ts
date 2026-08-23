"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { dollarsToCents, validateListing } from "@/lib/listings";
import type { ListingFieldErrors, ListingInput } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export interface ListingPayload extends ListingInput {
  listingId?: string;
  photoPaths?: string[];
}

export interface ListingActionState {
  error?: string;
  fieldErrors?: ListingFieldErrors;
  lotId?: string;
}

async function saveListing(
  _prev: ListingActionState,
  input: ListingPayload,
  status: "draft" | "pending",
): Promise<ListingActionState> {
  const { user } = await requireRole(["owner"]);

  const fieldErrors = validateListing(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase isn't configured yet." };
  }

  const { data: lotId, error } = await supabase.rpc("save_listing", {
    p_lot_id: input.listingId ?? null,
    p_owner_id: user.id,
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_parking_type: input.parkingType,
    p_spaces_count: input.spacesCount,
    p_vehicle_types: input.vehicleTypes,
    p_address: input.address.trim(),
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_rules: input.rules.trim(),
    p_status: status,
    p_hourly_rate_cents: dollarsToCents(input.hourlyRateDollars),
    p_currency: input.currency,
    p_availability: input.availability.map((slot) => ({
      day_of_week: slot.dayOfWeek,
      open_time: slot.openTime,
      close_time: slot.closeTime,
    })),
    p_blackout_dates: input.blackoutDates,
  });

  if (error || !lotId) {
    // Avoid dumping database internals at the user.
    return { error: "We couldn't save that listing. Please try again." };
  }

  const photoPaths = input.photoPaths ?? [];
  if (photoPaths.length > 0) {
    await supabase.from("parking_images").insert(
      photoPaths.map((path, index) => ({
        parking_lot_id: lotId,
        storage_path: path,
        position: index,
      })),
    );
  }

  revalidatePath("/dashboard/host");

  if (status === "draft") {
    redirect(`/dashboard/host/listings/${lotId}/edit?draft=true`);
  }
  redirect("/dashboard/host");
}

export async function saveDraft(
  prev: ListingActionState,
  input: ListingPayload,
) {
  return saveListing(prev, input, "draft");
}

export async function submitForReview(
  prev: ListingActionState,
  input: ListingPayload,
) {
  return saveListing(prev, input, "pending");
}

export async function deleteListing(listingId: string) {
  const { user } = await requireRole(["owner"]);

  const supabase = await createClient();
  if (!supabase) return;

  // Scoping by owner keeps a user from deleting someone else's listing even
  // if they guessed the id.
  await supabase
    .from("parking_lots")
    .delete()
    .eq("id", listingId)
    .eq("owner_id", user.id);

  revalidatePath("/dashboard/host");
}
