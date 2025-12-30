import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/browse/djs
 * Browse and search DJ profiles
 * 
 * Query params:
 * - search: Search by name, bio, or handle (when searching, shows all DJs including those without events)
 * - genre: Filter by genre (DJs can have multiple genres)
 * - country: Filter by country in location field
 * - limit: Number of results (default 12)
 * - offset: Pagination offset (default 0)
 * 
 * Browse rules:
 * - Must have a profile image (completed profile)
 * - Must have at least one event in lineup (prevents spam profiles)
 * - When searching, event requirement is relaxed to help find new DJs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const genre = searchParams.get("genre");
    const country = searchParams.get("country");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createServiceRoleClient();

    // Get all DJ IDs with their follower counts (for sorting by popularity)
    const { data: djFollowCounts } = await supabase
      .from("dj_follows")
      .select("dj_id")
      .then(async (result) => {
        if (result.error) return { data: null };
        
        // Count follows per DJ
        const counts: Record<string, number> = {};
        result.data?.forEach((follow) => {
          counts[follow.dj_id] = (counts[follow.dj_id] || 0) + 1;
        });
        return { data: counts };
      });

    // Get DJ IDs that have at least one event in lineup
    // This prevents spam/empty profiles from appearing in browse
    const { data: djsWithEvents } = await supabase
      .from("event_lineups")
      .select("dj_id");
    
    const djIdsWithEvents = new Set(djsWithEvents?.map(l => l.dj_id) || []);

    // Build the base query - only show DJs with profile images (completed profiles)
    // Filter out both null AND empty string values
    let query = supabase
      .from("djs")
      .select("id, name, handle, bio, genres, location, profile_image_url, cover_image_url", { count: "exact" })
      .not("profile_image_url", "is", null)
      .neq("profile_image_url", "");

    // Search by name, bio, or handle
    if (search) {
      query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%,handle.ilike.%${search}%`);
    }

    // Filter by genre (genres is an array)
    if (genre) {
      query = query.contains("genres", [genre]);
    }

    // Filter by country in location field
    if (country) {
      query = query.ilike("location", `%${country}%`);
    }

    // Get all matching DJs first (we'll sort by follower count in JS)
    const { data: allDjs, error } = await query;

    if (error) {
      console.error("[Browse DJs] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter DJs based on whether they have events
    // When searching, show all DJs (helps find new DJs)
    // When browsing (no search), require at least one event
    const filteredDjs = (allDjs || []).filter(dj => {
      if (search) {
        // When searching, show all DJs with profile images
        return true;
      }
      // When browsing, require at least one event
      return djIdsWithEvents.has(dj.id);
    });

    // Sort by follower count (most popular first), then by name
    const sortedDjs = filteredDjs.sort((a, b) => {
      const aFollowers = djFollowCounts?.[a.id] || 0;
      const bFollowers = djFollowCounts?.[b.id] || 0;
      
      // Sort by followers descending, then by name ascending
      if (bFollowers !== aFollowers) {
        return bFollowers - aFollowers;
      }
      return a.name.localeCompare(b.name);
    });

    // Apply pagination after sorting
    const paginatedDjs = sortedDjs.slice(offset, offset + limit);

    return NextResponse.json({
      djs: paginatedDjs,
      count: paginatedDjs.length,
      totalCount: sortedDjs.length, // Use filtered count, not raw count
      offset,
      limit,
    });
  } catch (error: any) {
    console.error("[Browse DJs] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch DJs" }, { status: 500 });
  }
}

