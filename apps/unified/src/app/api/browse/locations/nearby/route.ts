import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/browse/locations/nearby
 * Find cities with events within a radius of given coordinates
 * 
 * Query params:
 * - lat: Latitude
 * - lng: Longitude
 * - radius: Radius in kilometers (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radiusKm = parseFloat(searchParams.get("radius") || "50");

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Valid lat and lng parameters are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get all venues with events that have coordinates
    const { data: venues, error: venuesError } = await supabase
      .from("venues")
      .select(`
        id,
        city,
        state,
        country,
        latitude,
        longitude
      `)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (venuesError) {
      console.error("[Nearby Locations] Error fetching venues:", venuesError);
      return NextResponse.json(
        { error: "Failed to fetch venues" },
        { status: 500 }
      );
    }

    // Get venues that have upcoming events
    const now = new Date().toISOString();
    const { data: events } = await supabase
      .from("events")
      .select("venue_id")
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"])
      .gte("start_time", now);

    const venueIdsWithEvents = new Set(
      events?.map((e) => e.venue_id).filter(Boolean) || []
    );

    // Filter venues to only those with events
    const venuesWithEvents = (venues || []).filter((v) =>
      venueIdsWithEvents.has(v.id)
    );

    // Calculate distances and find cities within radius
    const R = 6371; // Earth's radius in kilometers
    const userLatRad = (lat * Math.PI) / 180;
    const userLngRad = (lng * Math.PI) / 180;

    const nearbyCities: Array<{
      city: string;
      state: string | null;
      country: string | null;
      distance: number;
      formattedLocation: string;
    }> = [];

    const seenCities = new Set<string>();

    for (const venue of venuesWithEvents) {
      if (!venue.latitude || !venue.longitude) continue;

      const venueLatRad = (venue.latitude * Math.PI) / 180;
      const venueLngRad = (venue.longitude * Math.PI) / 180;

      const dLat = venueLatRad - userLatRad;
      const dLon = venueLngRad - userLngRad;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLatRad) *
          Math.cos(venueLatRad) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance <= radiusKm && venue.city) {
        // Create unique key for city (handle cases where same city name in different states)
        const cityKey = venue.state
          ? `${venue.city}, ${venue.state}, ${venue.country}`
          : `${venue.city}, ${venue.country}`;

        if (!seenCities.has(cityKey)) {
          seenCities.add(cityKey);

          // Format location using standardized format
          const formattedLocation = venue.country
            ? `${venue.city}, ${venue.country}`
            : venue.city;

          nearbyCities.push({
            city: venue.city,
            state: venue.state,
            country: venue.country,
            distance: Math.round(distance * 10) / 10, // Round to 1 decimal
            formattedLocation,
          });
        }
      }
    }

    // Sort by distance (nearest first)
    nearbyCities.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      cities: nearbyCities,
      userLocation: { lat, lng },
      radius: radiusKm,
    });
  } catch (error: any) {
    console.error("[Nearby Locations] Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

