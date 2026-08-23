"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { ParkingSearchResult } from "@/app/api/parking/search/route";
import { DEFAULT_RADIUS_M, formatDistance } from "@/lib/search";
import { mapStyleUrl } from "@/lib/map-config";

interface Props {
  initialParking: ParkingSearchResult[];
  centerLat: number;
  centerLng: number;
  configured: boolean;
}

function priceLabel(lot: ParkingSearchResult): string {
  if (lot.hourly_rate_cents == null) return "Price on request";
  return `$${(lot.hourly_rate_cents / 100).toFixed(2)}/hr`;
}

export function ParkingMap({ initialParking, centerLat, centerLng, configured }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [parking, setParking] = useState<ParkingSearchResult[]>(initialParking);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!configured || !containerRef.current) return;

    let timeline = true;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyleUrl,
        center: [centerLng, centerLat],
        zoom: 13,
      });

      map.on("error", () => {
        if (timeline) setMapError(true);
      });
      map.on("load", () => {
        if (timeline) setMapError(false);
        mapRef.current = map;
      });
      mapRef.current = map;
    } catch {
      // Defer so we don't set state synchronously inside the effect.
      setTimeout(() => setMapError(true), 0);
    }

    return () => {
      timeline = false;
      clearMarkers();
      try {
        mapRef.current?.remove();
      } catch {
        /* already removed */
      }
      mapRef.current = null;
    };
  }, [configured, centerLat, centerLng, clearMarkers]);

  // Rebuild markers whenever the results or selection change.
  useEffect(() => {
    if (!mapRef.current) return;
    clearMarkers();

    parking.forEach((lot) => {
      const selected = lot.id === selectedId;
      const el = document.createElement("div");
      el.className =
        "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold shadow " +
        (selected
          ? "border-black bg-white text-black"
          : "border-black bg-emerald-500 text-black");
      el.textContent = "P";
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedId(lot.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lot.longitude, lot.latitude])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [parking, selectedId, clearMarkers]);

  const searchHere = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `/api/parking/search?lat=${center.lat}&lng=${center.lng}&radius=${DEFAULT_RADIUS_M}`,
      );
      if (!res.ok) throw new Error("search request failed");
      const data = await res.json();
      setParking(data.parking ?? []);
      setSelectedId(null);
    } catch {
      setFetchError("Couldn't search this area. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const locateMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
        });
      },
      () => {
        // Location denied; the map works fine without it.
      },
    );
  }, []);

  const selected = parking.find((p) => p.id === selectedId) ?? null;

  if (!configured) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
        Set the Supabase variables and a map style URL to see parking on the map.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative h-[50vh] overflow-hidden rounded-md border border-white/15 lg:h-[75vh]">
        <div ref={containerRef} className="absolute inset-0" />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 text-sm text-zinc-300">
            The map couldn&apos;t load. Please try again.
          </div>
        )}
        {loading && (
          <div className="absolute left-3 top-3 rounded-md bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300">
            Searching…
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={searchHere}
            disabled={loading}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
          >
            Search this area
          </button>
          <button
            type="button"
            onClick={locateMe}
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition-colors hover:border-white/50"
          >
            Use my location
          </button>
        </div>

        {fetchError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {fetchError}
          </p>
        )}

        {selected ? (
          <div className="rounded-md border border-white/15 p-4">
            <h3 className="text-lg font-semibold">{selected.name}</h3>
            <p className="text-sm text-zinc-400">
              {selected.parking_type} · {priceLabel(selected)}
              {selected.distance_m != null && ` · ${formatDistance(selected.distance_m)} away`}
            </p>
            <p className="mt-2 text-sm text-zinc-400">{selected.address}</p>
            <Link
              href={`/parking/${selected.id}`}
              className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              View parking
            </Link>
          </div>
        ) : (
          <div className="rounded-md border border-white/10 p-4 text-sm text-zinc-400">
            Click a marker to see details.
          </div>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">
            {parking.length} nearby
          </h2>
          {parking.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No parking found in this area. Move the map and search again.
            </p>
          ) : (
            <ul className="space-y-2">
              {parking.map((lot) => (
                <li key={lot.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(lot.id);
                      mapRef.current?.flyTo({
                        center: [lot.longitude, lot.latitude],
                        zoom: 14,
                      });
                    }}
                    className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                      selectedId === lot.id
                        ? "border-white/50 bg-white/5"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{lot.name}</span>
                      <span className="text-zinc-400">{priceLabel(lot)}</span>
                    </div>
                    <div className="mt-1 text-zinc-500">
                      {lot.parking_type}
                      {lot.distance_m != null && ` · ${formatDistance(lot.distance_m)} away`}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
