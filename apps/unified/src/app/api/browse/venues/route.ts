import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

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

    // Build base query
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
        country
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

    // Execute query with pagination
    const { data: venues, error: venuesError } = await query.range(offset, offset + limit - 1);

    if (venuesError) {
      console.error("[Browse Venues] Error fetching:", venuesError);
      return NextResponse.json({ error: venuesError.message, details: venuesError }, { status: 500 });
    }

    // Get tags for all venues
    const venueIds = venues?.map((v) => v.id) || [];
    let venueTagsMap: Record<string, { tag_type: string; tag_value: string }[]> = {};

    if (venueIds.length > 0) {
      const { data: tags } = await supabase
        .from("venue_tags")
        .select("venue_id, tag_type, tag_value")
        .in("venue_id", venueIds);

      // Group tags by venue_id
      venueTagsMap = (tags || []).reduce(
        (acc, tag) => {
          if (!acc[tag.venue_id]) {
            acc[tag.venue_id] = [];
          }
          acc[tag.venue_id].push({
            tag_type: tag.tag_type,
            tag_value: tag.tag_value,
          });
          return acc;
        },
        {} as Record<string, { tag_type: string; tag_value: string }[]>
      );
    }

    // Add tags to venues
    const venuesWithTags = (venues || []).map((venue) => ({
      ...venue,
      tags: venueTagsMap[venue.id] || [],
    }));

    return NextResponse.json({
      venues: venuesWithTags,
      count: venuesWithTags.length,
    });
  } catch (error: any) {
    console.error("[Browse Venues] Caught error:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Server error", stack: error.stack },
      { status: 500 }
    );
  }
}

