"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { validateBookingWindow } from "@/lib/reservations";
import { createClient } from "@/lib/supabase/server";

export interface ReservationActionState {
  error: string | null;
  message: string | null;
}

function friendlyError(message: string): string {
  if (!message) return "Something went wrong. Please try again.";
  // Database messages are already written for the user, just capitalize.
  return message.charAt(0).toUpperCase() + message.slice(1);
}

export async function createReservation(
  _prev: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const lotId = String(formData.get("lotId") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");

  const fieldErrors = validateBookingWindow(startsAt, endsAt);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: Object.values(fieldErrors)[0] ?? null, message: null };
  }

  // requireUser redirects to /login when there's no session.
  await requireUser();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase isn't configured yet.", message: null };
  }

  const { data, error } = await supabase.rpc("create_reservation", {
    p_lot_id: lotId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });

  if (error || !data) {
    return { error: friendlyError(error?.message ?? ""), message: null };
  }

  revalidatePath("/dashboard/reservations");
  redirect("/dashboard/reservations?created=1");
}

export async function cancelReservation(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "");

  await requireUser();
  const supabase = await createClient();
  if (!supabase) return;

  // Ownership and status are enforced inside cancel_reservation(), so an id
  // guessed from the page can't cancel someone else's booking.
  await supabase.rpc("cancel_reservation", { p_reservation_id: reservationId });

  revalidatePath("/dashboard/reservations");
  redirect("/dashboard/reservations?cancelled=1");
}
