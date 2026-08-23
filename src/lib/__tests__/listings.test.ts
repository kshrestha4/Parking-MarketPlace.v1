import { describe, expect, it } from "vitest";

import {
  centsToDollars,
  dollarsToCents,
  validateListing,
} from "../listings";

function validInput() {
  return {
    name: "Downtown Garage",
    description: "Covered parking near the transit hub.",
    parkingType: "garage",
    spacesCount: 10,
    vehicleTypes: ["car"],
    address: "120 Walnut St",
    latitude: 40.7128,
    longitude: -74.006,
    rules: "No overnight parking.",
    hourlyRateDollars: 5,
    currency: "USD",
    availability: [{ dayOfWeek: 1, openTime: "06:00", closeTime: "20:00" }],
    blackoutDates: [],
  };
}

describe("validateListing", () => {
  it("accepts a valid listing", () => {
    expect(validateListing(validInput())).toEqual({});
  });

  it("rejects a missing name and address", () => {
    const input = validInput();
    input.name = "";
    input.address = "   ";
    const errors = validateListing(input);
    expect(errors.name).toBeTruthy();
    expect(errors.address).toBeTruthy();
  });

  it("rejects an invalid price", () => {
    const input = validInput();
    input.hourlyRateDollars = -1;
    expect(validateListing(input).hourlyRate).toBeTruthy();

    input.hourlyRateDollars = 0;
    expect(validateListing(input).hourlyRate).toBeTruthy();
  });

  it("rejects an invalid capacity", () => {
    const input = validInput();
    input.spacesCount = 0;
    expect(validateListing(input).spacesCount).toBeTruthy();

    input.spacesCount = 1.5;
    expect(validateListing(input).spacesCount).toBeTruthy();
  });

  it("rejects out-of-range coordinates", () => {
    const input = validInput();
    input.latitude = 91;
    expect(validateListing(input).latitude).toBeTruthy();

    input.latitude = 40;
    input.longitude = 181;
    expect(validateListing(input).longitude).toBeTruthy();
  });

  it("requires at least one availability slot", () => {
    const input = validInput();
    input.availability = [];
    expect(validateListing(input).availability).toBeTruthy();
  });

  it("rejects a close time before the open time", () => {
    const input = validInput();
    input.availability = [{ dayOfWeek: 1, openTime: "20:00", closeTime: "06:00" }];
    expect(validateListing(input)["availability.0.time"]).toBeTruthy();
  });
});

describe("money conversion", () => {
  it("converts between dollars and cents", () => {
    expect(dollarsToCents(5)).toBe(500);
    expect(dollarsToCents(5.5)).toBe(550);
    expect(centsToDollars(412)).toBeCloseTo(4.12);
  });
});
