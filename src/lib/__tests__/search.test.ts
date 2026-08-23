import { describe, expect, it } from "vitest";

import {
  DEFAULT_RADIUS_M,
  MAX_RADIUS_M,
  formatDistance,
  metersToMiles,
  validateSearchParams,
} from "../search";

describe("validateSearchParams", () => {
  it("accepts valid coordinates and radius", () => {
    expect(validateSearchParams(40.7128, -74.006, 5000)).toEqual({});
  });

  it("rejects an out-of-range latitude", () => {
    expect(validateSearchParams(91, -74, 1000).lat).toBeTruthy();
    expect(validateSearchParams(-91, -74, 1000).lat).toBeTruthy();
  });

  it("rejects an out-of-range longitude", () => {
    expect(validateSearchParams(40, 181, 1000).lng).toBeTruthy();
    expect(validateSearchParams(40, -181, 1000).lng).toBeTruthy();
  });

  it("rejects NaN coordinates", () => {
    expect(validateSearchParams(NaN, -74, 1000).lat).toBeTruthy();
  });

  it("rejects a zero or excessive radius", () => {
    expect(validateSearchParams(40, -74, 0).radius).toBeTruthy();
    expect(validateSearchParams(40, -74, -1).radius).toBeTruthy();
    expect(validateSearchParams(40, -74, MAX_RADIUS_M + 1).radius).toBeTruthy();
  });

  it("accepts the default radius", () => {
    expect(validateSearchParams(40, -74, DEFAULT_RADIUS_M)).toEqual({});
  });
});

describe("distance helpers", () => {
  it("converts meters to miles", () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1);
    expect(metersToMiles(0)).toBe(0);
  });

  it("formats small distances", () => {
    expect(formatDistance(50)).toBe("under 0.1 mi");
    expect(formatDistance(700)).toBe("0.4 mi");
  });
});
