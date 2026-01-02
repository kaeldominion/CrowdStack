import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getVenueEventGenre } from "@/lib/constants/genres";
import { CACHE, getCacheControl } from "@/lib/cache";

/**
 * GET /api/browse/events
 * Public browse events endpoint with search and filters
 * Returns published upcoming events with venue data
 * Updated: Dec 2024 - Added live events fallback and featured support
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
    const live = searchParams.get("live") === "true";
    const past = searchParams.get("past") === "true"; // Get past events instead of future
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

    // Debug counts removed for performance - were making 3 extra queries per request

    // Build base query - include registration count via relation
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
        capacity,
        registration_type,
        external_ticket_url,
        venue:venues(
          id,
          name,
          city,
          state,
          country
        ),
        event_lineups(
          djs(
            id,
            name,
            handle
          )
        ),
        registrations(count)
      `, { count: 'exact' })
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"]);

    // Apply live filter, past filter, or future events filter
    if (live) {
      // Live events: started but not ended
      query = query
        .lte("start_time", now.toISOString())
        .or(`end_time.is.null,end_time.gte.${now.toISOString()}`);
      query = query.order("start_time", { ascending: true });
    } else if (past) {
      // Past events: ended or started more than 12 hours ago with no end time
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      query = query.lt("start_time", twelveHoursAgo.toISOString());
      query = query.order("start_time", { ascending: false }); // Most recent first
    } else {
      // Default: only show future events
      query = query.gte("start_time", now.toISOString());
      query = query.order("start_time", { ascending: true });
    }

    // Query params logging removed for performance

    // Apply featured filter - skip for now since column may not exist
    // When featured=true, we'll use the fallback logic below to return regular events
    // This ensures the landing page always shows events
    // TODO: Once migration 068 is applied and is_featured column exists, enable: query = query.eq("is_featured", true);

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
    
    // If featured=true, skip the main query and go straight to fallback logic
    // This avoids issues if is_featured column doesn't exist yet
    let events: any[] | null = null;
    let eventsError: any = null;
    
    let totalCount = 0;
    if (!featured) {
      // Regular query for non-featured requests - count included
      const result = await query
        .limit(fetchLimit)
        .range(offset, offset + fetchLimit - 1);
      events = result.data;
      eventsError = result.error;
      totalCount = result.count || 0;
    }
    // For featured=true, we skip the main query and go straight to fallback below


    if (eventsError) {
      console.error("[Browse Events] Error fetching:", eventsError);
      return NextResponse.json({ 
        error: "Failed to fetch events",
        details: eventsError.message 
      }, { status: 500 });
    }


    // Apply search filter after fetching (due to join limitations)
    if (search && events) {
      const searchLower = search.toLowerCase();
      events = events.filter((event: any) => {
        const eventName = event.name?.toLowerCase() || "";
        const venueName = (event.venue as any)?.name?.toLowerCase() || "";
        
        // Search in DJ names from lineups
        const lineups = event.event_lineups || [];
        const djNames = lineups
          .map((lineup: any) => {
            const dj = Array.isArray(lineup.djs) ? lineup.djs[0] : lineup.djs;
            return dj?.name?.toLowerCase() || dj?.handle?.toLowerCase() || "";
          })
          .filter(Boolean);
        
        const matchesDJ = djNames.some((djName: string) => djName.includes(searchLower));
        
        return eventName.includes(searchLower) || venueName.includes(searchLower) || matchesDJ;
      });
    }

    // If featured filter, always use fallback to regular upcoming events (for now)
    // This ensures the landing page always shows events, even if is_featured column doesn't exist
    // TODO: Once migration 068 is applied, check for featured events first, then fall back if none exist
    if (featured) {
      // Using regular events as fallback for featured requests
      
      // Include both future events AND currently live events (started in last 12 hours)
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      
      // Build fallback query - include registrations count via relation
      const { data: fallbackEvents, error: fallbackError, count: fallbackCount } = await supabase
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
          capacity,
          registration_type,
          external_ticket_url,
          venue:venues(
            id,
            name,
            city,
            state,
            country
          ),
          event_lineups(
            djs(
              id,
              name,
              handle
            )
          ),
          registrations(count)
        `, { count: 'exact' })
        .eq("status", "published")
        .in("venue_approval_status", ["approved", "not_required"])
        .gte("start_time", twelveHoursAgo.toISOString())
        .or("registration_type.is.null,registration_type.eq.guestlist")
        .order("start_time", { ascending: true })
        .limit(limit);

      if (!fallbackError && fallbackEvents && fallbackEvents.length > 0) {
        totalCount = fallbackCount || 0;
        // Shuffle for variety, then transform registration counts
        const shuffled = [...fallbackEvents].sort(() => Math.random() - 0.5);
        events = shuffled.slice(0, limit).map((event: any) => ({
          ...event,
          registration_count: event.registrations?.[0]?.count || 0,
          registrations: undefined,
        }));
      }
    }

    // Apply genre filter (if specified, filter by event tags OR venue tags)
    // Uses genre mapping: if user searches "Tech House", it maps to "House" and finds events/venues with "House" tag
    if (genre && events && events.length > 0) {
      const eventIds = events.map((e) => e.id);
      
      // Map the search genre to venue/event genre (e.g., "Tech House" → "House")
      const venueEventGenre = getVenueEventGenre(genre) || genre;
      
      // Get events with matching genre tag
      const { data: taggedEvents } = await supabase
        .from("event_tags")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("tag_type", "music")
        .eq("tag_value", venueEventGenre);

      const matchingEventIds = new Set(taggedEvents?.map((t) => t.event_id) || []);

      // Get venues for these events
      const venueIds = events
        .map((e) => (e.venue as any)?.id)
        .filter(Boolean) as string[];

      // Get venues with matching genre tag
      let matchingVenueIds = new Set<string>();
      if (venueIds.length > 0) {
        const { data: taggedVenues } = await supabase
          .from("venue_tags")
          .select("venue_id")
          .in("venue_id", venueIds)
          .eq("tag_type", "music")
          .eq("tag_value", venueEventGenre);

        matchingVenueIds = new Set(taggedVenues?.map((t) => t.venue_id) || []);
      }

      // Filter events to only those with matching event tags OR venue tags
      events = events.filter((e) => {
        const eventId = e.id;
        const venueId = (e.venue as any)?.id;
        return matchingEventIds.has(eventId) || (venueId && matchingVenueIds.has(venueId));
      });
    }

    // Total count is now included in the main query via { count: 'exact' }

    // Apply pagination after filtering
    const paginatedEvents = (events || []).slice(0, limit);
    const filteredCount = events?.length || 0;

    // Transform events to include registration_count from relation
    const eventsWithCounts = paginatedEvents.map((event: any) => ({
      ...event,
      registration_count: event.registrations?.[0]?.count || 0,
      registrations: undefined, // Remove raw relation data
    }));

    return NextResponse.json(
      {
        events: eventsWithCounts,
        count: filteredCount, // Count of events after all filters (before pagination)
        totalCount: totalCount || 0, // Total count of all matching events
      },
      {
        headers: {
          'Cache-Control': getCacheControl(CACHE.publicBrowse),
        },
      }
    );
  } catch (error: any) {
    console.error("[Browse Events] Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

