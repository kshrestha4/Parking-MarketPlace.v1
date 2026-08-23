import type { Metadata } from "next";

import { SearchView } from "@/components/search/search-view";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEFAULT_RADIUS_M } from "@/lib/search";
import type { ParkingSearchResult } from "@/app/api/parking/search/route";

export const metadata: Metadata = {
  title: "Find parking",
};

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

export default async function SearchPage() {
  const configured = isSupabaseConfigured();

  let initial: ParkingSearchResult[] = [];
  const center = DEFAULT_CENTER;
  if (configured) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.rpc("search_parking", {
        p_lat: center.lat,
        p_lng: center.lng,
        p_radius_m: DEFAULT_RADIUS_M,
      });
      initial = (data as ParkingSearchResult[]) ?? [];
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Find parking</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Search by area, apply filters, and tap a marker to view details.
      </p>
      <div className="mt-4">
        <SearchView
          initialParking={initial}
          initialLat={center.lat}
          initialLng={center.lng}
          configured={configured}
        />
      </div>
    </div>
  );
}
