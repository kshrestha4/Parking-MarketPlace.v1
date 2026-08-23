"use client";

import Link from "next/link";

import type { ParkingSearchResult } from "@/app/api/parking/search/route";
import { formatDistance } from "@/lib/search";

function priceLabel(lot: ParkingSearchResult): string {
  if (lot.hourly_rate_cents == null) return "Price on request";
  return `$${(lot.hourly_rate_cents / 100).toFixed(2)}/hr`;
}

interface Props {
  parking: ParkingSearchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ResultsList({ parking, selectedId, onSelect }: Props) {
  if (parking.length === 0) {
    return (
      <div className="rounded-md border border-white/10 p-4 text-sm text-zinc-400">
        <p className="font-medium text-zinc-300">No parking found</p>
        <p className="mt-1">
          Try increasing the search radius, removing a filter, or searching
          another area.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm text-zinc-400">{parking.length} results</p>
      <ul className="space-y-2">
        {parking.map((lot) => (
          <li key={lot.id}>
            <button
              type="button"
              onClick={() => onSelect(lot.id)}
              className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                selectedId === lot.id
                  ? "border-white/50 bg-white/5"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{lot.name}</span>
                <span className="shrink-0 text-zinc-400">{priceLabel(lot)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {lot.parking_type}
                  {lot.distance_m != null && ` · ${formatDistance(lot.distance_m)}`}
                </span>
                <Link
                  href={`/parking/${lot.id}`}
                  className="text-zinc-400 hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  View →
                </Link>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
