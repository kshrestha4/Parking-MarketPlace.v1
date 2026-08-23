"use client";

import { PARKING_TYPES } from "@/lib/listings";
import { RADIUS_OPTIONS } from "@/lib/search";
import type { SearchFilters } from "@/lib/search";

interface Props {
  filters: SearchFilters;
  radius: number;
  onChange: (filters: SearchFilters, radius: number) => void;
}

export function FilterBar({ filters, radius, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Radius</span>
        <select
          className="rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm focus:border-white/40"
          value={radius}
          onChange={(e) => onChange(filters, Number(e.target.value))}
        >
          {RADIUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900">
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Type</span>
        <select
          className="rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm focus:border-white/40"
          value={filters.parkingType ?? ""}
          onChange={(e) =>
            onChange(
              { ...filters, parkingType: e.target.value || undefined },
              radius,
            )
          }
        >
          <option value="" className="bg-zinc-900">
            All types
          </option>
          {PARKING_TYPES.map((type) => (
            <option key={type} value={type} className="bg-zinc-900">
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Min $/hr</span>
        <input
          type="number"
          min={0}
          step={0.5}
          className="w-20 rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm focus:border-white/40"
          value={filters.minPrice ?? ""}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...filters, minPrice: v }, radius);
          }}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Max $/hr</span>
        <input
          type="number"
          min={0}
          step={0.5}
          className="w-20 rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm focus:border-white/40"
          value={filters.maxPrice ?? ""}
          placeholder="Any"
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...filters, maxPrice: v }, radius);
          }}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Sort by</span>
        <select
          className="rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm focus:border-white/40"
          value={filters.sort}
          onChange={(e) =>
            onChange(
              { ...filters, sort: e.target.value as SearchFilters["sort"] },
              radius,
            )
          }
        >
          <option value="distance" className="bg-zinc-900">
            Distance
          </option>
          <option value="price_asc" className="bg-zinc-900">
            Price: low → high
          </option>
          <option value="price_desc" className="bg-zinc-900">
            Price: high → low
          </option>
        </select>
      </label>
    </div>
  );
}
