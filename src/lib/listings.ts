// Domain values shared by the listing form, the dashboard, and the server
// actions so they can't drift apart.

export const PARKING_TYPES = ["street", "lot", "garage", "driveway"] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export const VEHICLE_TYPES = ["car", "motorcycle", "van", "truck", "ev"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const LISTING_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export interface AvailabilityInput {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // "HH:MM"
  closeTime: string;
}

export interface ListingInput {
  name: string;
  description: string;
  parkingType: string;
  spacesCount: number;
  vehicleTypes: string[];
  address: string;
  latitude: number;
  longitude: number;
  rules: string;
  hourlyRateDollars: number;
  currency: string;
  availability: AvailabilityInput[];
  blackoutDates: string[]; // "YYYY-MM-DD"
}

export interface ListingFieldErrors {
  [field: string]: string;
}

export function validateListing(input: ListingInput): ListingFieldErrors {
  const errors: ListingFieldErrors = {};

  if (!input.name.trim()) errors.name = "Enter a name for the parking.";
  else if (input.name.trim().length < 2) errors.name = "Name is too short.";

  if (!input.parkingType) errors.parkingType = "Choose a parking type.";
  else if (!(PARKING_TYPES as readonly string[]).includes(input.parkingType)) {
    errors.parkingType = "Choose a valid parking type.";
  }

  if (!Number.isInteger(input.spacesCount) || input.spacesCount < 1) {
    errors.spacesCount = "Spaces must be at least 1.";
  } else if (input.spacesCount > 1000) {
    errors.spacesCount = "That's more spaces than we can accept.";
  }

  if (!input.address.trim()) errors.address = "Enter the street address.";

  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    errors.latitude = "Enter a valid latitude.";
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    errors.longitude = "Enter a valid longitude.";
  }

  if (!Number.isFinite(input.hourlyRateDollars) || input.hourlyRateDollars <= 0) {
    errors.hourlyRate = "Enter a price above $0.";
  } else if (input.hourlyRateDollars > 1000) {
    errors.hourlyRate = "That price looks too high.";
  }

  if (!input.currency || input.currency.length !== 3) {
    errors.currency = "Enter a 3-letter currency code.";
  }

  if (input.availability.length === 0) {
    errors.availability = "Add at least one day you're open.";
  } else {
    input.availability.forEach((slot, index) => {
      const prefix = `availability.${index}`;
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        errors[`${prefix}.dayOfWeek`] = "Pick a valid day.";
      }
      if (!slot.openTime || !slot.closeTime) {
        errors[`${prefix}.time`] = "Set an open and close time.";
      } else if (slot.closeTime <= slot.openTime) {
        errors[`${prefix}.time`] = "Close time must be after open time.";
      }
    });
  }

  return errors;
}

// Loosens stored cents into dollars for the form, and the reverse.
export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
