import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/browse/locations/search
 * Search for cities with events (for autocomplete)
 * 
 * Query params:
 * - q: Search query
 * - limit: Max results (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ cities: [] });
    }

    const supabase = createServiceRoleClient();

    // Get all venues with upcoming events
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

    if (venueIdsWithEvents.size === 0) {
      return NextResponse.json({ cities: [] });
    }

    // Search venues by city, state, or country
    const searchLower = query.toLowerCase();
    const { data: venues, error: venuesError } = await supabase
      .from("venues")
      .select("id, city, state, country")
      .in("id", Array.from(venueIdsWithEvents))
      .or(
        `city.ilike.%${query}%,state.ilike.%${query}%,country.ilike.%${query}%`
      )
      .limit(limit * 3); // Get more to filter unique cities

    if (venuesError) {
      console.error("[Location Search] Error:", venuesError);
      return NextResponse.json(
        { error: "Failed to search locations" },
        { status: 500 }
      );
    }

    // Group by city and format locations
    const cityMap = new Map<
      string,
      { city: string; state: string | null; country: string | null }
    >();

    for (const venue of venues || []) {
      if (!venue.city) continue;

      // Create unique key
      const key = venue.state
        ? `${venue.city}, ${venue.state}, ${venue.country}`
        : `${venue.city}, ${venue.country}`;

      if (!cityMap.has(key)) {
        cityMap.set(key, {
          city: venue.city,
          state: venue.state,
          country: venue.country,
        });
      }
    }

    // Convert to array and format
    const results = Array.from(cityMap.values())
      .map((v) => {
        // Format using standardized format
        const formattedLocation = v.country
          ? `${v.city}, ${v.country}`
          : v.city;

        // Calculate relevance score (exact match > starts with > contains)
        let score = 0;
        const cityLower = v.city.toLowerCase();
        const stateLower = v.state?.toLowerCase() || "";
        const countryLower = v.country?.toLowerCase() || "";

        if (cityLower === searchLower) score = 100;
        else if (cityLower.startsWith(searchLower)) score = 50;
        else if (cityLower.includes(searchLower)) score = 25;
        else if (stateLower.includes(searchLower)) score = 15;
        else if (countryLower.includes(searchLower)) score = 10;

        return {
          value: v.city, // Use city as value for filtering
          label: formattedLocation,
          city: v.city,
          state: v.state,
          country: v.country,
          score,
        };
      })
      .filter((r) => r.score > 0) // Only include matches
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .slice(0, limit); // Limit results

    return NextResponse.json({ cities: results });
  } catch (error: any) {
    console.error("[Location Search] Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

