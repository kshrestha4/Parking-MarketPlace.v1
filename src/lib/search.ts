// Validation and helpers for the parking search. Shared by the API route and
// the map so the limits can't drift.

import { PARKING_TYPES } from "./listings";

export const MAX_RADIUS_M = 50_000; // 50 km
export const DEFAULT_RADIUS_M = 5_000;

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  parkingType?: string;
  sort: "distance" | "price_asc" | "price_desc";
}

export interface SearchErrors {
  lat?: string;
  lng?: string;
  radius?: string;
  minPrice?: string;
  maxPrice?: string;
  parkingType?: string;
}

export function validateSearchParams(
  lat: number,
  lng: number,
  radius: number,
  filters: { minPrice?: number; maxPrice?: number; parkingType?: string } = {},
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

  if (filters.minPrice != null) {
    if (!Number.isFinite(filters.minPrice) || filters.minPrice < 0) {
      errors.minPrice = "Minimum price must be 0 or more.";
    }
  }
  if (filters.maxPrice != null) {
    if (!Number.isFinite(filters.maxPrice) || filters.maxPrice < 0) {
      errors.maxPrice = "Maximum price must be 0 or more.";
    }
  }
  if (
    filters.minPrice != null &&
    filters.maxPrice != null &&
    filters.maxPrice < filters.minPrice
  ) {
    errors.maxPrice = "Maximum price must be at least the minimum.";
  }

  if (
    filters.parkingType != null &&
    filters.parkingType !== "" &&
    !(PARKING_TYPES as readonly string[]).includes(filters.parkingType)
  ) {
    errors.parkingType = "That parking type isn't supported.";
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

// Predefined radius options for the customer filter.
export const RADIUS_OPTIONS = [
  { label: "0.5 mi", value: 805 },
  { label: "1 mi", value: 1609 },
  { label: "2 mi", value: 3219 },
  { label: "5 mi", value: 8047 },
] as const;
