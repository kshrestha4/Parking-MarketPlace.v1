// Price estimation shared by the booking form and any future checkout UI.
//
// The authoritative total is computed inside create_reservation() in the
// database. This mirrors that exact formula so the customer sees the same
// number before booking, without duplicating business logic in a way that
// could drift.

export interface PriceBreakdown {
  totalCents: number;
  platformFeeCents: number;
  ownerPayoutCents: number;
  durationMinutes: number;
}

export function estimatePrice(
  hourlyRateCents: number,
  platformFeePercent: number,
  startsAt: string,
  endsAt: string,
): PriceBreakdown {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const durationMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);

  // round() here must match PostgreSQL's round() on the same inputs.
  const totalCents = Math.round((hourlyRateCents * durationMinutes) / 60);
  const platformFeeCents = Math.round((totalCents * platformFeePercent) / 100);
  return {
    totalCents,
    platformFeeCents,
    ownerPayoutCents: totalCents - platformFeeCents,
    durationMinutes,
  };
}
