"use client";

import { useActionState, useState } from "react";

import {
  PARKING_TYPES,
  VEHICLE_TYPES,
  validateListing,
  type AvailabilityInput,
  type ListingInput,
} from "@/lib/listings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_IMAGES_PER_LISTING,
  validatePhotos,
} from "@/lib/photo-validation";
import {
  saveDraft,
  submitForReview,
  type ListingActionState,
  type ListingPayload,
} from "@/app/dashboard/host/listings/actions";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface Photo {
  file?: File;
  path?: string;
}

// Existing listing data coming from the edit page, or null for a new listing.
export interface InitialListing {
  id: string;
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
  blackoutDates: string[];
  photoPaths: string[];
}

const initialState: ListingActionState = {};

function fromInitial(initial: InitialListing | null) {
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    parkingType: initial?.parkingType ?? "lot",
    spacesCount: initial ? String(initial.spacesCount) : "1",
    vehicleTypes: initial?.vehicleTypes ?? ["car"],
    address: initial?.address ?? "",
    latitude: initial ? String(initial.latitude) : "",
    longitude: initial ? String(initial.longitude) : "",
    rules: initial?.rules ?? "",
    hourlyRateDollars: initial ? String(initial.hourlyRateDollars) : "",
    currency: initial?.currency ?? "USD",
    availability:
      initial?.availability.length ? initial.availability : [{ dayOfWeek: 1, openTime: "06:00", closeTime: "20:00" }],
    blackoutDates: initial?.blackoutDates ?? [],
    photos: (initial?.photoPaths ?? []).map((path) => ({ path })),
  };
}

export function ListingForm({ initial }: { initial: InitialListing | null }) {
  const [form, setForm] = useState(() => fromInitial(initial));
  const [photos, setPhotos] = useState<Photo[]>(() => fromInitial(initial).photos);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [storageNotice, setStorageNotice] = useState(
    isSupabaseConfigured() ? null : "Photos need Supabase Storage, which isn't configured yet.",
  );

  const [draftState, draftAction, draftPending] = useActionState(saveDraft, initialState);
  const [submitState, submitAction, submitPending] = useActionState(submitForReview, initialState);

  const error = draftState.error || submitState.error;
  const pending = draftPending || submitPending || uploading;

  function set<K extends keyof ReturnType<typeof fromInitial>>(
    key: K,
    value: ReturnType<typeof fromInitial>[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  // Upload new images to Supabase Storage, falling back to no-op (with a
  // notice) when storage isn't wired up. The returned paths go into the
  // listing alongside any that already exist.
  async function handleSubmit(status: "draft" | "pending") {
    const input: ListingInput = {
      name: form.name,
      description: form.description,
      parkingType: form.parkingType,
      spacesCount: Number(form.spacesCount),
      vehicleTypes: form.vehicleTypes,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      rules: form.rules,
      hourlyRateDollars: Number(form.hourlyRateDollars),
      currency: form.currency,
      availability: form.availability,
      blackoutDates: form.blackoutDates,
    };

    const errors = validateListing(input);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStorageNotice(null);
      return;
    }

    const newFiles = photos.filter((p): p is { file: File } => Boolean(p.file));
    const photoCheck = validatePhotos(
      newFiles.map((p) => ({ name: p.file.name, type: p.file.type, size: p.file.size })),
    );
    const photoError = photoCheck.count || photoCheck.type || photoCheck.size;
    if (photoError) {
      setStorageNotice(photoError);
      return;
    }

    let photoPaths = photos.filter((p) => p.path).map((p) => p.path as string);

    if (newFiles.length > 0) {
      if (!isSupabaseConfigured()) {
        setStorageNotice("Photos couldn't be uploaded because Storage isn't configured.");
        return;
      }
      setUploading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUploading(false);
        setStorageNotice("You need to be signed in to upload photos.");
        return;
      }
      const paths: string[] = [];
      for (const photo of newFiles) {
        // Paths are prefixed with the owner id so storage RLS can scope every
        // object to the person who uploaded it.
        const filePath = `${user.id}/${crypto.randomUUID()}-${photo.file.name.replace(/\s+/g, "-")}`;
        const { error } = await supabase.storage
          .from("parking-images")
          .upload(filePath, photo.file);
        if (error) {
          setUploading(false);
          setStorageNotice("One of the photos failed to upload. Check the file and try again.");
          return;
        }
        paths.push(filePath);
      }
      setUploading(false);
      photoPaths = [...photoPaths, ...paths];
    }

    const payload: ListingPayload = {
      ...input,
      listingId: initial?.id,
      photoPaths,
    };

    setFieldErrors({});
    if (status === "draft") {
      draftAction(payload);
    } else {
      submitAction(payload);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {storageNotice && (
        <p className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
          {storageNotice}
        </p>
      )}

      {/* Details */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Parking details</h2>
        <Field label="Name" error={fieldErrors.name}>
          <input
            className={inputCls(!!fieldErrors.name)}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Downtown covered garage"
          />
        </Field>
        <Field label="Description" error={fieldErrors.description}>
          <textarea
            className={inputCls(!!fieldErrors.description)}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Covered, well-lit, a short walk to the station."
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" error={fieldErrors.parkingType}>
            <select
              className={inputCls(!!fieldErrors.parkingType)}
              value={form.parkingType}
              onChange={(e) => set("parkingType", e.target.value)}
            >
              {PARKING_TYPES.map((type) => (
                <option key={type} value={type} className="bg-zinc-900">
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number of spaces" error={fieldErrors.spacesCount}>
            <input
              type="number"
              min={1}
              className={inputCls(!!fieldErrors.spacesCount)}
              value={form.spacesCount}
              onChange={(e) => set("spacesCount", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Vehicles accepted" error={fieldErrors.vehicleTypes}>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_TYPES.map((vehicle) => {
              const checked = form.vehicleTypes.includes(vehicle);
              return (
                <label
                  key={vehicle}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    checked ? "border-white/60 text-white" : "border-white/15 text-zinc-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      set(
                        "vehicleTypes",
                        checked
                          ? form.vehicleTypes.filter((v) => v !== vehicle)
                          : [...form.vehicleTypes, vehicle],
                      )
                    }
                  />
                  {vehicle}
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="Rules" error={fieldErrors.rules}>
          <textarea
            className={inputCls(!!fieldErrors.rules)}
            value={form.rules}
            onChange={(e) => set("rules", e.target.value)}
            rows={2}
            placeholder="No overnight parking, please."
          />
        </Field>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Location</h2>
        <Field label="Street address" error={fieldErrors.address}>
          <input
            className={inputCls(!!fieldErrors.address)}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="120 Walnut St"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Latitude" error={fieldErrors.latitude}>
            <input
              type="number"
              step="any"
              className={inputCls(!!fieldErrors.latitude)}
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
              placeholder="40.7128"
            />
          </Field>
          <Field label="Longitude" error={fieldErrors.longitude}>
            <input
              type="number"
              step="any"
              className={inputCls(!!fieldErrors.longitude)}
              value={form.longitude}
              onChange={(e) => set("longitude", e.target.value)}
              placeholder="-74.0060"
            />
          </Field>
        </div>
        <p className="text-xs text-zinc-500">
          An interactive map picker replaces these fields in an upcoming milestone.
        </p>
      </section>

      {/* Photos */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Photos</h2>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setPhotos((prev) => [
              ...prev,
              ...files.map((file) => ({ file })),
            ].slice(0, MAX_IMAGES_PER_LISTING));
            e.target.value = "";
          }}
        />
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300"
              >
                {photo.path ? photo.path.split("/").pop() : photo.file?.name}
                <button
                  type="button"
                  className="text-zinc-500 hover:text-white"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500">
          Up to {MAX_IMAGES_PER_LISTING} photos, jpg/png/webp, 5 MB each.
        </p>
      </section>

      {/* Availability */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Availability</h2>
        {form.availability.map((slot, index) => (
          <div key={index} className="flex items-end gap-3">
            <Field label="Day">
              <select
                className={inputCls(false)}
                value={slot.dayOfWeek}
                onChange={(e) => {
                  const next = [...form.availability];
                  next[index] = { ...next[index], dayOfWeek: Number(e.target.value) };
                  set("availability", next);
                }}
              >
                {DAY_LABELS.map((day, i) => (
                  <option key={day} value={i} className="bg-zinc-900">
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opens">
              <input
                type="time"
                className={inputCls(false)}
                value={slot.openTime}
                onChange={(e) => {
                  const next = [...form.availability];
                  next[index] = { ...next[index], openTime: e.target.value };
                  set("availability", next);
                }}
              />
            </Field>
            <Field label="Closes">
              <input
                type="time"
                className={inputCls(false)}
                value={slot.closeTime}
                onChange={(e) => {
                  const next = [...form.availability];
                  next[index] = { ...next[index], closeTime: e.target.value };
                  set("availability", next);
                }}
              />
            </Field>
            <button
              type="button"
              className="mb-1 text-sm text-zinc-500 hover:text-white"
              onClick={() => set("availability", form.availability.filter((_, idx) => idx !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        {fieldErrors.availability && (
          <p className="text-sm text-red-400">{fieldErrors.availability}</p>
        )}
        <button
          type="button"
          className="text-sm text-zinc-400 hover:text-white"
          onClick={() =>
            set("availability", [
              ...form.availability,
              { dayOfWeek: 1, openTime: "06:00", closeTime: "20:00" },
            ])
          }
        >
          + Add a day
        </button>
      </section>

      {/* Blackout dates */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Temporarily unavailable</h2>
        {form.blackoutDates.map((date, index) => (
          <div key={index} className="flex items-end gap-3">
            <Field label="Date">
              <input
                type="date"
                className={inputCls(false)}
                value={date}
                onChange={(e) => {
                  const next = [...form.blackoutDates];
                  next[index] = e.target.value;
                  set("blackoutDates", next);
                }}
              />
            </Field>
            <button
              type="button"
              className="mb-1 text-sm text-zinc-500 hover:text-white"
              onClick={() => set("blackoutDates", form.blackoutDates.filter((_, idx) => idx !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-zinc-400 hover:text-white"
          onClick={() => set("blackoutDates", [...form.blackoutDates, ""])}
        >
          + Add a date
        </button>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pricing</h2>
        <div className="flex items-end gap-3">
          <Field label="Hourly rate">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputCls(!!fieldErrors.hourlyRate)} pl-7`}
                value={form.hourlyRateDollars}
                onChange={(e) => set("hourlyRateDollars", e.target.value)}
                placeholder="5.00"
              />
            </div>
          </Field>
          <Field label="Currency">
            <select
              className={inputCls(!!fieldErrors.currency)}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {["USD", "CAD", "EUR", "GBP"].map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {fieldErrors.hourlyRate && (
          <p className="text-sm text-red-400">{fieldErrors.hourlyRate}</p>
        )}
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleSubmit("draft")}
          className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium transition-colors hover:border-white/50 disabled:opacity-60"
        >
          {draftPending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => handleSubmit("pending")}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
        >
          {submitPending ? "Submitting…" : "Submit for review"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Submitting sends the listing for admin approval before customers can book it.
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:border-white/40 ${
    hasError ? "border-red-500/60" : "border-white/15"
  }`;
}
