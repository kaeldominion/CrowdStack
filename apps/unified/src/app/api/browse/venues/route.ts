import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { CACHE, getCacheControl } from "@/lib/cache";

// Enable edge runtime for better caching
export const runtime = 'edge';

// Edge runtime doesn't support revalidate, we use cache headers instead

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
    // NOTE: logo_url and cover_image_url excluded - some venues have base64 data URIs
    // that bloat responses (200KB+ per venue). Fetch images on venue detail page only.
    let query = supabase
      .from("venues")
      .select(`
        id,
        name,
        slug,
        tagline,
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
      // Images excluded from browse query - set to null for UI fallback
      logo_url: null,
      cover_image_url: null,
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
          'Cache-Control': getCacheControl({ tier: 'public-short', maxAge: 30, swr: 120 }),
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

