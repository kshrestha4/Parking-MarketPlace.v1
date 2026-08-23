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

// GET /api/parking/search?lat=&lng=&radius=&minPrice=&maxPrice=&parkingType=&sort=
// Returns only approved parking, filtered and ordered server-side.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius") ?? DEFAULT_RADIUS_M);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const parkingType = searchParams.get("parkingType");
  const sort = searchParams.get("sort") ?? "distance";

  const minPriceNum = minPrice != null ? Number(minPrice) : undefined;
  const maxPriceNum = maxPrice != null ? Number(maxPrice) : undefined;

  const errors = validateSearchParams(lat, lng, radius, {
    minPrice: minPriceNum,
    maxPrice: maxPriceNum,
    parkingType: parkingType ?? undefined,
  });
  if (Object.keys(errors).length > 0) {
    const first = Object.values(errors)[0];
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ parking: [] });
  }

  // Dollar amounts come in from the UI; the function expects cents.
  const { data, error } = await supabase.rpc("search_parking", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radius,
    p_min_price_cents: minPriceNum != null ? Math.round(minPriceNum * 100) : null,
    p_max_price_cents: maxPriceNum != null ? Math.round(maxPriceNum * 100) : null,
    p_parking_type: parkingType || null,
  });

  if (error) {
    console.error("parking search failed", error.message);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  let results = (data as ParkingSearchResult[]) ?? [];

  // PostGIS returns ordered by distance. Client-requested sorting happens
  // here after the query so the DB stays focused on spatial concerns.
  if (sort === "price_asc") {
    results = [...results].sort((a, b) => (a.hourly_rate_cents ?? Infinity) - (b.hourly_rate_cents ?? Infinity));
  } else if (sort === "price_desc") {
    results = [...results].sort((a, b) => (b.hourly_rate_cents ?? -1) - (a.hourly_rate_cents ?? -1));
  }

  return NextResponse.json({ parking: results });
}
