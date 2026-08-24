// Shared reservation domain values. Statuses match the reservation_status enum
// in the database; the labels are only for display.

export const RESERVATION_STATUSES = [
  "pending",
  "payment_pending",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "expired",
  "failed",
  "refunded",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pending",
  payment_pending: "Awaiting payment",
  confirmed: "Confirmed",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  failed: "Failed",
  refunded: "Refunded",
};

// A booking can be cancelled while it is still pending or confirmed. Once it
// has started or finished, cancelling is no longer an option.
export function isCancellable(status: string): boolean {
  return ["pending", "payment_pending", "confirmed"].includes(status);
}

export interface ReservationFieldErrors {
  [field: string]: string;
}

// Light validation for the booking form. The real gate is create_reservation()
// in the database; this just keeps obvious mistakes out of the request.
export function validateBookingWindow(
  startsAt: string,
  endsAt: string,
): ReservationFieldErrors {
  const errors: ReservationFieldErrors = {};
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (!Number.isFinite(start.getTime())) {
    errors.startsAt = "Choose a date and start time.";
    return errors;
  }
  if (!Number.isFinite(end.getTime())) {
    errors.endsAt = "Choose an end time.";
    return errors;
  }

  if (end <= start) {
    errors.endsAt = "End time must be after the start time.";
  }

  const minutes = (end.getTime() - start.getTime()) / 60000;
  if (minutes < 30) {
    errors.endsAt = "Bookings must be at least 30 minutes.";
  }
  if (minutes > 24 * 60) {
    errors.endsAt = "Bookings must fit within one day for now.";
  }

  if (start < new Date()) {
    errors.startsAt = "Pick a time in the future.";
  }

  if (start.toDateString() !== end.toDateString()) {
    errors.endsAt = "Bookings must start and end on the same day for now.";
  }

  return errors;
}
