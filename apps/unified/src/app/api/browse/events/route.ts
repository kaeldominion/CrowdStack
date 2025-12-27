import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/browse/events
 * Public browse events endpoint with search and filters
 * Returns published upcoming events with venue data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const dateFilter = searchParams.get("date"); // "today", "this_week", "this_month", or ISO date range
    const city = searchParams.get("city");
    const genre = searchParams.get("genre"); // music tag value
    const venueId = searchParams.get("venue_id");
    const featured = searchParams.get("featured") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Calculate date range based on filter
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateFilter) {
      switch (dateFilter) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "this_week":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(now.getDate() + 7);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "this_month":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setMonth(now.getMonth() + 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          // Try to parse as ISO date range (format: "2024-01-01,2024-01-31")
          const dateRange = dateFilter.split(",");
          if (dateRange.length === 2) {
            startDate = new Date(dateRange[0]);
            endDate = new Date(dateRange[1]);
            endDate.setHours(23, 59, 59, 999);
          }
      }
    }

    // Debug: First check total published events
    const { count: totalPublished } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");
    
    const { count: totalApproved } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"]);
    
    const { count: totalFuture } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"])
      .gte("start_time", now.toISOString());

    console.log("[Browse Events] Debug counts:", {
      totalPublished,
      totalApproved,
      totalFuture,
    });

    // Build base query
    let query = supabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        flier_url,
        cover_image_url,
        start_time,
        end_time,
        venue_approval_status,
        venue:venues(
          id,
          name,
          city,
          state,
          country
        )
      `)
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"])
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true });

    console.log("[Browse Events] Query params:", {
      search,
      dateFilter,
      city,
      genre,
      venueId,
      featured,
      limit,
      offset,
      now: now.toISOString(),
    });

    // Apply featured filter (if is_featured column exists)
    // Note: This will be enabled after migration 068 is run
    if (featured) {
      // For now, just return regular events until migration is applied
      // query = query.eq("is_featured", true);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte("start_time", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("start_time", endDate.toISOString());
    }
    // Note: We already filter for future events in the base query, so no need to add it again

    // Apply venue filter
    if (venueId) {
      query = query.eq("venue_id", venueId);
    }

    // Apply city filter (via venue) - need to get venue IDs first
    let cityVenueIds: string[] | null = null;
    if (city) {
      const { data: cityVenues } = await supabase
        .from("venues")
        .select("id")
        .eq("city", city);
      
      cityVenueIds = cityVenues?.map((v) => v.id) || [];
      
      if (cityVenueIds.length === 0) {
        // No venues in this city, return empty result
        return NextResponse.json({
          events: [],
          count: 0,
        });
      }
      
      query = query.in("venue_id", cityVenueIds);
    }

    // Apply search filter - need to handle separately due to join limitations
    // We'll filter after fetching if search is provided

    // Execute query - get more results if we need to filter by search
    const fetchLimit = search ? limit * 3 : limit; // Get more if we need to filter
    let { data: events, error: eventsError } = await query
      .limit(fetchLimit)
      .range(offset, offset + fetchLimit - 1);

    console.log("[Browse Events] Query result:", {
      eventsCount: events?.length || 0,
      error: eventsError?.message,
      hasError: !!eventsError,
    });

    if (eventsError) {
      console.error("[Browse Events] Error fetching:", eventsError);
      return NextResponse.json({ 
        error: "Failed to fetch events",
        details: eventsError.message 
      }, { status: 500 });
    }

    // Debug: Check if we have events before filtering
    console.log("[Browse Events] Events before filtering:", events?.length || 0);

    // Apply search filter after fetching (due to join limitations)
    if (search && events) {
      const searchLower = search.toLowerCase();
      events = events.filter((event: any) => {
        const eventName = event.name?.toLowerCase() || "";
        const venueName = (event.venue as any)?.name?.toLowerCase() || "";
        return eventName.includes(searchLower) || venueName.includes(searchLower);
      });
    }

    // If featured filter and no results, fall back to random events
    if (featured && (!events || events.length === 0)) {
      const { data: randomEvents, error: randomError } = await supabase
        .from("events")
        .select(`
          id,
          name,
          slug,
          flier_url,
          cover_image_url,
          start_time,
          end_time,
          venue_approval_status,
          venue:venues(
            id,
            name,
            city,
            state,
            country
          )
        `)
        .eq("status", "published")
        .in("venue_approval_status", ["approved", "not_required"])
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true })
        .limit(limit);

      if (!randomError && randomEvents) {
        // Shuffle and take limit
        const shuffled = randomEvents.sort(() => Math.random() - 0.5);
        events = shuffled.slice(0, limit);
      }
    }

    // Apply genre filter (if specified, filter by venue tags)
    if (genre && events && events.length > 0) {
      const eventIds = events.map((e) => e.id);
      
      // Get venues for these events
      const venueIds = events
        .map((e) => (e.venue as any)?.id)
        .filter(Boolean) as string[];

      if (venueIds.length > 0) {
        // Get venues with matching genre tag
        const { data: taggedVenues } = await supabase
          .from("venue_tags")
          .select("venue_id")
          .in("venue_id", venueIds)
          .eq("tag_type", "music")
          .eq("tag_value", genre);

        const matchingVenueIds = new Set(taggedVenues?.map((t) => t.venue_id) || []);

        // Filter events to only those with matching venue tags
        events = events.filter((e) => {
          const venueId = (e.venue as any)?.id;
          return venueId && matchingVenueIds.has(venueId);
        });
      }
    }

    // Get total count before pagination (for stats)
    // We need to count all matching events, not just the paginated ones
    const totalCountQuery = supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"])
      .gte("start_time", now.toISOString());

    // Apply same filters for count
    if (venueId) {
      totalCountQuery.eq("venue_id", venueId);
    }
    if (cityVenueIds) {
      totalCountQuery.in("venue_id", cityVenueIds);
    }
    if (startDate) {
      totalCountQuery.gte("start_time", startDate.toISOString());
    }
    if (endDate) {
      totalCountQuery.lte("start_time", endDate.toISOString());
    }

    const { count: totalCount } = await totalCountQuery;

    // Apply pagination after filtering
    const paginatedEvents = (events || []).slice(0, limit);
    const filteredCount = events?.length || 0;

    console.log("[Browse Events] Final result:", {
      paginatedCount: paginatedEvents.length,
      filteredCount,
      totalCount,
    });

    return NextResponse.json({
      events: paginatedEvents,
      count: filteredCount, // Count of events after all filters (before pagination)
      totalCount: totalCount || 0, // Total count of all matching events
    });
  } catch (error: any) {
    console.error("[Browse Events] Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

