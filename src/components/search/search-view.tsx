"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ParkingSearchResult } from "@/app/api/parking/search/route";
import { DEFAULT_RADIUS_M, type SearchFilters } from "@/lib/search";
import { FilterBar } from "./filter-bar";
import { ResultsList } from "./results-list";
import { ParkingMap } from "./parking-map";

interface Props {
  initialParking: ParkingSearchResult[];
  initialLat: number;
  initialLng: number;
  configured: boolean;
}

// Read search state from the URL. Returns defaults when the URL has no params.
function readUrlParams(): { lat: number; lng: number; radius: number; filters: SearchFilters } {
  if (typeof window === "undefined") {
    return { lat: 0, lng: 0, radius: DEFAULT_RADIUS_M, filters: { sort: "distance" } };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    lat: Number(p.get("lat")) || 0,
    lng: Number(p.get("lng")) || 0,
    radius: Number(p.get("radius")) || DEFAULT_RADIUS_M,
    filters: {
      minPrice: p.get("minPrice") ? Number(p.get("minPrice")) : undefined,
      maxPrice: p.get("maxPrice") ? Number(p.get("maxPrice")) : undefined,
      parkingType: p.get("parkingType") || undefined,
      sort: (p.get("sort") as SearchFilters["sort"]) || "distance",
    },
  };
}

function writeUrlParams(lat: number, lng: number, radius: number, filters: SearchFilters) {
  const p = new URLSearchParams();
  p.set("lat", String(lat));
  p.set("lng", String(lng));
  if (radius !== DEFAULT_RADIUS_M) p.set("radius", String(radius));
  if (filters.minPrice != null) p.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) p.set("maxPrice", String(filters.maxPrice));
  if (filters.parkingType) p.set("parkingType", filters.parkingType);
  if (filters.sort !== "distance") p.set("sort", filters.sort);
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? "?" + qs : ""}`;
  window.history.replaceState(null, "", url);
}

export function SearchView({ initialParking, initialLat, initialLng, configured }: Props) {
  // Use a lazy initializer to read URL params once on mount (not on every render).
  const [lat, setLat] = useState(() => {
    const url = readUrlParams();
    return url.lat || initialLat;
  });
  const [lng, setLng] = useState(() => {
    const url = readUrlParams();
    return url.lng || initialLng;
  });
  const [radius, setRadius] = useState(() => readUrlParams().radius);
  const [filters, setFilters] = useState<SearchFilters>(() => readUrlParams().filters);
  const [parking, setParking] = useState<ParkingSearchResult[]>(initialParking);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [configuredState] = useState(configured);

  const fetchParking = useCallback(
    async (lat: number, lng: number, radius: number, filters: SearchFilters) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius: String(radius),
          sort: filters.sort,
        });
        if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
        if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
        if (filters.parkingType) params.set("parkingType", filters.parkingType);

        const res = await fetch(`/api/parking/search?${params}`);
        if (!res.ok) throw new Error("search request failed");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setParking(data.parking ?? []);
        setSelectedId(null);
        setMapError(false);
      } catch {
        setError("Couldn't search. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch once on mount if we have URL state or need defaults.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (configured && lat !== 0) {
      // Defer so we don't call setState synchronously in the effect.
      queueMicrotask(() => {
        fetchParking(lat, lng, radius, filters);
        writeUrlParams(lat, lng, radius, filters);
      });
    }
  }, [lat, lng, radius, filters, configured, fetchParking]);

  const handleFilterChange = useCallback(
    (newFilters: SearchFilters, newRadius: number) => {
      setFilters(newFilters);
      setRadius(newRadius);
      fetchParking(lat, lng, newRadius, newFilters);
      writeUrlParams(lat, lng, newRadius, newFilters);
    },
    [lat, lng, fetchParking],
  );

  const handleSearchHere = useCallback(
    (center: { lat: number; lng: number }) => {
      setLat(center.lat);
      setLng(center.lng);
      fetchParking(center.lat, center.lng, radius, filters);
      writeUrlParams(center.lat, center.lng, radius, filters);
    },
    [radius, filters, fetchParking],
  );

  const selected = parking.find((p) => p.id === selectedId) ?? null;

  if (!configuredState) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
        Set the Supabase variables and a map style URL to search for parking.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} radius={radius} onChange={handleFilterChange} />

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Desktop: map + list side by side. Mobile: list on top, map below. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Mobile: list first, then map. Desktop: map first (col 1), list second (col 2). */}
        <div className="order-2 lg:order-1">
          <ParkingMap
            parking={parking}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSearchHere={handleSearchHere}
            centerLat={lat}
            centerLng={lng}
            loading={loading}
            mapError={mapError}
          />
        </div>

        <div className="order-1 max-h-[50vh] overflow-y-auto lg:order-2 lg:max-h-[calc(100vh-200px)]">
          {selected ? (
            <div className="mb-4 rounded-md border border-white/15 p-4">
              <h3 className="text-lg font-semibold">{selected.name}</h3>
              <p className="text-sm text-zinc-400">
                {selected.parking_type}
                {selected.hourly_rate_cents != null &&
                  ` · $${(selected.hourly_rate_cents / 100).toFixed(2)}/hr`}
                {selected.distance_m != null && ` · ${Math.round(selected.distance_m)}m away`}
              </p>
              <p className="mt-2 text-sm text-zinc-400">{selected.address}</p>
              <a
                href={`/parking/${selected.id}`}
                className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                View parking
              </a>
            </div>
          ) : (
            <div className="mb-4 rounded-md border border-white/10 p-4 text-sm text-zinc-400">
              Click a marker or a result to see details.
            </div>
          )}

          <ResultsList
            parking={parking}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
}
