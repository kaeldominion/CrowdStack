import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { CACHE, getCacheControl } from "@/lib/cache";

// Enable edge runtime for better caching and lower latency
export const runtime = 'edge';

// Edge runtime doesn't support revalidate, we use cache headers instead

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
 *
 * PERFORMANCE OPTIMIZATION (Jan 2024):
 * - When not searching, use inner join with event_lineups to get only DJs with events at DB level
 * - This eliminates client-side filtering of potentially 1000+ records
 * - Pagination is applied at database level for browse mode
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

    // PERFORMANCE: Different query strategies for browse vs search
    if (!search) {
      // BROWSE MODE: Use inner join with event_lineups to only get DJs with events
      // This moves the "has events" filter to database level, reducing data transfer
      let browseQuery = supabase
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
          event_lineups!inner(id),
          dj_follows(count)
        `, { count: "exact" })
        .not("profile_image_url", "is", null)
        .neq("profile_image_url", "");

      // Filter by genre (genres is an array)
      if (genre) {
        browseQuery = browseQuery.contains("genres", [genre]);
      }

      // Filter by country in location field
      if (country) {
        browseQuery = browseQuery.ilike("location", `%${country}%`);
      }

      // Order by name for consistent results
      // Note: Can't easily order by follower_count at DB level without denormalization
      browseQuery = browseQuery.order("name", { ascending: true });

      // PERFORMANCE: Apply pagination at database level
      browseQuery = browseQuery.range(offset, offset + limit - 1);

      const { data: browseDjs, error, count: totalCount } = await browseQuery;

      if (error) {
        console.error("[Browse DJs] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Transform DJs - count event_lineups from the inner join result
      const transformedDjs = (browseDjs || []).map((dj: any) => ({
        id: dj.id,
        name: dj.name,
        handle: dj.handle,
        bio: dj.bio,
        genres: dj.genres,
        location: dj.location,
        profile_image_url: dj.profile_image_url,
        cover_image_url: dj.cover_image_url,
        event_count: Array.isArray(dj.event_lineups) ? dj.event_lineups.length : 1,
        follower_count: dj.dj_follows?.[0]?.count || 0,
      }));

      // Sort by follower count client-side (can't easily do at DB level)
      const sortedDjs = transformedDjs.sort((a, b) => {
        if (b.follower_count !== a.follower_count) {
          return b.follower_count - a.follower_count;
        }
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json(
        {
          djs: sortedDjs,
          count: sortedDjs.length,
          totalCount: totalCount || 0,
          offset,
          limit,
        },
        {
          headers: {
            'Cache-Control': getCacheControl(CACHE.publicBrowse),
          },
        }
      );
    }

    // SEARCH MODE: Show all DJs matching search, including those without events
    // This helps users find new DJs
    let searchQuery = supabase
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
      .neq("profile_image_url", "")
      .or(`name.ilike.%${search}%,bio.ilike.%${search}%,handle.ilike.%${search}%`);

    // Filter by genre (genres is an array)
    if (genre) {
      searchQuery = searchQuery.contains("genres", [genre]);
    }

    // Filter by country in location field
    if (country) {
      searchQuery = searchQuery.ilike("location", `%${country}%`);
    }

    // Order by name and apply pagination at database level
    searchQuery = searchQuery
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: searchDjs, error, count: totalCount } = await searchQuery;

    if (error) {
      console.error("[Browse DJs] Search error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform DJs
    const transformedDjs = (searchDjs || []).map((dj: any) => ({
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

    // Sort by follower count (most popular first), then by name
    const sortedDjs = transformedDjs.sort((a, b) => {
      if (b.follower_count !== a.follower_count) {
        return b.follower_count - a.follower_count;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(
      {
        djs: sortedDjs,
        count: sortedDjs.length,
        totalCount: totalCount || 0,
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

