import type { Metadata } from "next";

import { ParkingMap } from "@/components/parking-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEFAULT_RADIUS_M } from "@/lib/search";
import type { ParkingSearchResult } from "@/app/api/parking/search/route";

export const metadata: Metadata = {
  title: "Find parking",
};

// A sensible starting viewport. The map recenters when the customer searches
// or uses their location.
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

export default async function SearchPage() {
  const configured = isSupabaseConfigured();

  let initial: ParkingSearchResult[] = [];
  if (configured) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.rpc("search_parking", {
        p_lat: DEFAULT_CENTER.lat,
        p_lng: DEFAULT_CENTER.lng,
        p_radius_m: DEFAULT_RADIUS_M,
      });
      initial = (data as ParkingSearchResult[]) ?? [];
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Find parking</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Move the map and search an area, or tap a marker to see details.
      </p>
      <div className="mt-4">
        <ParkingMap
          initialParking={initial}
          centerLat={DEFAULT_CENTER.lat}
          centerLng={DEFAULT_CENTER.lng}
          configured={configured}
        />
      </div>
    </div>
  );
}
