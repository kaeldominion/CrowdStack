import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { CACHE, getCacheControl } from "@/lib/cache";

// Enable edge runtime for better caching and lower latency
export const runtime = 'edge';

// Revalidate every 60 seconds
export const revalidate = 60;

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

    // Build the base query with counts via relations
    // Only show DJs with profile images (completed profiles)
    let query = supabase
      .from("djs")
      .select(`
        id, 
        name, 
        handle, 
        bio, 
        genres, 
        location, 
        profile_image_url, 
        cover_image_url,
        event_lineups(count),
        dj_follows(count)
      `, { count: "exact" })
      .not("profile_image_url", "is", null)
      .neq("profile_image_url", "");

    // When browsing (no search), only show DJs with at least one event
    // We'll filter this after the query since Supabase can't filter on aggregates
    
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

    // Order by name for consistent results
    query = query.order("name", { ascending: true });

    // Get DJs with counts included
    const { data: allDjs, error, count: totalCount } = await query;

    if (error) {
      console.error("[Browse DJs] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform and filter DJs
    const transformedDjs = (allDjs || []).map((dj: any) => ({
      id: dj.id,
      name: dj.name,
      handle: dj.handle,
      bio: dj.bio,
      genres: dj.genres,
      location: dj.location,
      profile_image_url: dj.profile_image_url,
      cover_image_url: dj.cover_image_url,
      event_count: dj.event_lineups?.[0]?.count || 0,
      follower_count: dj.dj_follows?.[0]?.count || 0,
    }));

    // Filter DJs based on whether they have events (unless searching)
    const filteredDjs = transformedDjs.filter(dj => {
      if (search) {
        // When searching, show all DJs with profile images
        return true;
      }
      // When browsing, require at least one event
      return dj.event_count > 0;
    });

    // Sort by follower count (most popular first), then by name
    const sortedDjs = filteredDjs.sort((a, b) => {
      if (b.follower_count !== a.follower_count) {
        return b.follower_count - a.follower_count;
      }
      return a.name.localeCompare(b.name);
    });

    // Apply pagination after sorting
    const paginatedDjs = sortedDjs.slice(offset, offset + limit);
    const djsWithStats = paginatedDjs;

    return NextResponse.json(
      {
        djs: djsWithStats,
        count: djsWithStats.length,
        totalCount: sortedDjs.length, // Use filtered count, not raw count
        offset,
        limit,
      },
      {
        headers: {
          'Cache-Control': getCacheControl(CACHE.publicBrowse),
        },
      }
    );
  } catch (error: any) {
    console.error("[Browse DJs] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch DJs" }, { status: 500 });
  }
}

