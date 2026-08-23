"use client";

import { useCallback, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { ParkingSearchResult } from "@/app/api/parking/search/route";
import { mapStyleUrl } from "@/lib/map-config";

interface Props {
  parking: ParkingSearchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSearchHere: (center: { lat: number; lng: number }) => void;
  centerLat: number;
  centerLng: number;
  loading: boolean;
  mapError: boolean;
}

export function ParkingMap({
  parking,
  selectedId,
  onSelect,
  onSearchHere,
  centerLat,
  centerLng,
  loading,
  mapError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;

    let alive = true;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyleUrl,
        center: [centerLng, centerLat],
        zoom: 13,
      });

      map.on("error", () => {});
      map.on("load", () => {
        if (alive) mapRef.current = map;
      });
      // Set immediately so SearchThisArea button works before full load.
      mapRef.current = map;
    } catch {
      // Map creation failed — parent will show the error state.
    }

    return () => {
      alive = false;
      clearMarkers();
      try { mapRef.current?.remove(); } catch { /* */ }
      mapRef.current = null;
    };
  }, [centerLat, centerLng, clearMarkers]);

  // Rebuild markers when parking or selection changes.
  useEffect(() => {
    if (!mapRef.current) return;
    clearMarkers();

    parking.forEach((lot) => {
      const selected = lot.id === selectedId;
      const el = document.createElement("div");
      el.className =
        "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold shadow cursor-pointer " +
        (selected
          ? "border-black bg-white text-black"
          : "border-black bg-emerald-500 text-black");
      el.textContent = "P";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(lot.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lot.longitude, lot.latitude])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [parking, selectedId, clearMarkers, onSelect]);

  return (
    <div className="relative h-[40vh] overflow-hidden rounded-md border border-white/15 lg:h-full">
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
      <button
        type="button"
        onClick={() => {
          if (mapRef.current) {
            const c = mapRef.current.getCenter();
            onSearchHere({ lat: c.lat, lng: c.lng });
          }
        }}
        disabled={loading}
        className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow transition-colors hover:bg-zinc-200 disabled:opacity-60"
      >
        Search this area
      </button>
    </div>
  );
}
