import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RADIUS_M, validateSearchParams } from "@/lib/search";

export interface ParkingSearchResult {
  id: string;
  name: string;
  parking_type: string;
  address: string;
  hourly_rate_cents: number | null;
  currency: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
}

// GET /api/parking/search?lat=&lng=&radius=
// Returns only approved parking within `radius` meters of the point. The
// PostGIS distance calc lives in the search_parking function; we never pull
// every lot and measure it in JavaScript.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius") ?? DEFAULT_RADIUS_M);

  const errors = validateSearchParams(lat, lng, radius);
  if (errors.lat) {
    return NextResponse.json({ error: errors.lat }, { status: 400 });
  }
  if (errors.lng) {
    return NextResponse.json({ error: errors.lng }, { status: 400 });
  }
  if (errors.radius) {
    return NextResponse.json({ error: errors.radius }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ parking: [] });
  }

  const { data, error } = await supabase.rpc("search_parking", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radius,
  });

  if (error) {
    // Log the technical detail server-side, keep the response vague.
    console.error("parking search failed", error.message);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  return NextResponse.json({ parking: (data as ParkingSearchResult[]) ?? [] });
}
