import { describe, expect, it } from "vitest";

import { isCancellable, validateBookingWindow } from "../reservations";

const DAY = "2026-09-01"; // a Tuesday

describe("validateBookingWindow", () => {
  it("accepts a valid same-day window", () => {
    const errors = validateBookingWindow(`${DAY}T10:00:00`, `${DAY}T12:00:00`);
    expect(errors).toEqual({});
  });

  it("rejects an end before the start", () => {
    const errors = validateBookingWindow(`${DAY}T12:00:00`, `${DAY}T10:00:00`);
    expect(errors.endsAt).toBeTruthy();
  });

  it("rejects bookings under 30 minutes", () => {
    const errors = validateBookingWindow(`${DAY}T10:00:00`, `${DAY}T10:15:00`);
    expect(errors.endsAt).toMatch(/30 minutes/);
  });

  it("rejects multi-day bookings", () => {
    const errors = validateBookingWindow(`${DAY}T10:00:00`, `${DAY}T12:00:00`);
    const nextDay = validateBookingWindow(`${DAY}T22:00:00`, "2026-09-02T02:00:00");
    expect(errors).toEqual({});
    expect(nextDay.endsAt).toMatch(/same day/);
  });

  it("rejects a start in the past", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const errors = validateBookingWindow(past, future);
    expect(errors.startsAt).toMatch(/future/);
  });

  it("rejects garbage input", () => {
    const errors = validateBookingWindow("not-a-date", `${DAY}T12:00:00`);
    expect(errors.startsAt).toBeTruthy();
  });
});

describe("isCancellable", () => {
  it("allows cancelling pending and confirmed bookings", () => {
    expect(isCancellable("pending")).toBe(true);
    expect(isCancellable("payment_pending")).toBe(true);
    expect(isCancellable("confirmed")).toBe(true);
  });

  it("blocks cancelling terminal or in-progress bookings", () => {
    expect(isCancellable("active")).toBe(false);
    expect(isCancellable("completed")).toBe(false);
    expect(isCancellable("cancelled")).toBe(false);
    expect(isCancellable("expired")).toBe(false);
    expect(isCancellable("refunded")).toBe(false);
  });
});
