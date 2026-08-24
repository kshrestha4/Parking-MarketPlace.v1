import { describe, expect, it } from "vitest";

import { estimatePrice } from "../pricing";

describe("estimatePrice", () => {
  it("computes a simple two-hour booking", () => {
    const price = estimatePrice(1000, 10, "2026-09-01T10:00:00", "2026-09-01T12:00:00");
    expect(price.durationMinutes).toBe(120);
    expect(price.totalCents).toBe(2000);
    expect(price.platformFeeCents).toBe(200);
    expect(price.ownerPayoutCents).toBe(1800);
  });

  it("prorates fractional hours", () => {
    const price = estimatePrice(1000, 10, "2026-09-01T10:00:00", "2026-09-01T11:30:00");
    expect(price.totalCents).toBe(1500);
    expect(price.platformFeeCents).toBe(150);
  });

  it("rounds half-hours consistently with the database", () => {
    // 1000 cents/hr for 30 min = 500; fee on 500 at 10% = 50.
    const price = estimatePrice(1000, 10, "2026-09-01T10:00:00", "2026-09-01T10:30:00");
    expect(price.totalCents).toBe(500);
    expect(price.platformFeeCents).toBe(50);
  });

  it("handles a zero-fee platform", () => {
    const price = estimatePrice(500, 0, "2026-09-01T10:00:00", "2026-09-01T12:00:00");
    expect(price.totalCents).toBe(1000);
    expect(price.platformFeeCents).toBe(0);
    expect(price.ownerPayoutCents).toBe(1000);
  });

  it("never returns a negative duration for reversed times", () => {
    const price = estimatePrice(1000, 10, "2026-09-01T12:00:00", "2026-09-01T10:00:00");
    expect(price.durationMinutes).toBe(0);
    expect(price.totalCents).toBe(0);
  });
});
