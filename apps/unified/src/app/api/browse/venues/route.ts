import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { CACHE, getCacheControl } from "@/lib/cache";

/**
 * GET /api/browse/venues
 * Public browse venues endpoint with search and filters
 * Returns venues with tags
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const city = searchParams.get("city");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build base query - use JOIN to fetch tags in single query
    let query = supabase
      .from("venues")
      .select(`
        id,
        name,
        slug,
        tagline,
        logo_url,
        cover_image_url,
        city,
        state,
        country,
        venue_tags(tag_type, tag_value)
      `)
      .order("name", { ascending: true });

    // Apply city filter
    if (city) {
      query = query.eq("city", city);
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,tagline.ilike.%${search}%`);
    }

    // Execute query with pagination - single query with tags included
    const { data: venues, error: venuesError } = await query.range(offset, offset + limit - 1);

    if (venuesError) {
      console.error("[Browse Venues] Error fetching:", venuesError);
      return NextResponse.json({ error: venuesError.message, details: venuesError }, { status: 500 });
    }

    // Transform venue_tags to tags array format
    const venuesWithTags = (venues || []).map((venue: any) => ({
      ...venue,
      tags: venue.venue_tags || [],
      venue_tags: undefined, // Remove the raw relation field
    }));

    return NextResponse.json(
      {
        venues: venuesWithTags,
        count: venuesWithTags.length,
      },
      {
        headers: {
          'Cache-Control': getCacheControl(CACHE.publicBrowse),
        },
      }
    );
  } catch (error: any) {
    console.error("[Browse Venues] Caught error:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Server error", stack: error.stack },
      { status: 500 }
    );
  }
}

