// Validation and helpers for the parking search. Shared by the API route and
// the map so the limits can't drift.

export const MAX_RADIUS_M = 50_000; // 50 km
export const DEFAULT_RADIUS_M = 5_000;

export interface SearchErrors {
  lat?: string;
  lng?: string;
  radius?: string;
}

export function validateSearchParams(
  lat: number,
  lng: number,
  radius: number,
): SearchErrors {
  const errors: SearchErrors = {};

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.lat = "Latitude must be between -90 and 90.";
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.lng = "Longitude must be between -180 and 180.";
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > MAX_RADIUS_M) {
    errors.radius = `Radius must be between 0 and ${MAX_RADIUS_M} meters.`;
  }

  return errors;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

// A short "0.4 mi away" style distance for the UI. Not used for any logic.
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "";
  const miles = metersToMiles(meters);
  if (miles < 0.1) return "under 0.1 mi";
  return `${miles.toFixed(1)} mi`;
}
