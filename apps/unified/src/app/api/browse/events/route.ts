import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getVenueEventGenre } from "@/lib/constants/genres";

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
        )
      `)
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

    console.log("[Browse Events] Query params:", {
      search,
      dateFilter,
      city,
      genre,
      venueId,
      featured,
      live,
      past,
      limit,
      offset,
      now: now.toISOString(),
    });

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
    
    if (!featured) {
      // Regular query for non-featured requests
      const result = await query
        .limit(fetchLimit)
        .range(offset, offset + fetchLimit - 1);
      events = result.data;
      eventsError = result.error;
    }
    // For featured=true, we skip the main query and go straight to fallback below

    console.log("[Browse Events] Query result:", {
      eventsCount: events?.length || 0,
      error: eventsError?.message,
      hasError: !!eventsError,
      featured,
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
      console.log("[Browse Events] No featured events found, falling back to regular events");
      
      // Include both future events AND currently live events (started in last 12 hours)
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      
      // Build fallback query - same as base query but without is_featured filter
      // Also filter out external_link events for featured/landing page display
      const { data: fallbackEvents, error: fallbackError } = await supabase
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
          )
        `)
        .eq("status", "published")
        .in("venue_approval_status", ["approved", "not_required"])
        .gte("start_time", twelveHoursAgo.toISOString())
        .or("registration_type.is.null,registration_type.eq.guestlist")
        .order("start_time", { ascending: true })
        .limit(limit);

      if (!fallbackError && fallbackEvents && fallbackEvents.length > 0) {
        // Get registration counts for fallback events
        const fallbackEventIds = fallbackEvents.map((e: any) => e.id);
        let fallbackRegistrationCounts: Record<string, number> = {};

        if (fallbackEventIds.length > 0) {
          const { data: fallbackRegistrations } = await supabase
            .from("registrations")
            .select("event_id")
            .in("event_id", fallbackEventIds);

          fallbackRegistrationCounts = (fallbackRegistrations || []).reduce(
            (acc, reg) => {
              acc[reg.event_id] = (acc[reg.event_id] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );
        }

        // Shuffle for variety, then add registration counts
        const shuffled = [...fallbackEvents].sort(() => Math.random() - 0.5);
        events = shuffled.slice(0, limit).map((event: any) => ({
          ...event,
          registration_count: fallbackRegistrationCounts[event.id] || 0,
        }));
        
        console.log("[Browse Events] Fallback returned", events.length, "events");
      } else {
        console.log("[Browse Events] Fallback also returned no events:", {
          fallbackError: fallbackError?.message,
          fallbackEventsCount: fallbackEvents?.length || 0,
        });
      }
    }

    // Apply genre filter (if specified, filter by venue tags)
    // Uses genre mapping: if user searches "Tech House", it maps to "House" and finds venues with "House" tag
    if (genre && events && events.length > 0) {
      const eventIds = events.map((e) => e.id);
      
      // Get venues for these events
      const venueIds = events
        .map((e) => (e.venue as any)?.id)
        .filter(Boolean) as string[];

      if (venueIds.length > 0) {
        // Map the search genre to venue/event genre (e.g., "Tech House" → "House")
        const venueEventGenre = getVenueEventGenre(genre) || genre;
        
        // Get venues with matching genre tag (using mapped genre)
        const { data: taggedVenues } = await supabase
          .from("venue_tags")
          .select("venue_id")
          .in("venue_id", venueIds)
          .eq("tag_type", "music")
          .eq("tag_value", venueEventGenre);

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
      .in("venue_approval_status", ["approved", "not_required"]);

    // Apply same live/future filter for count
    if (live) {
      totalCountQuery
        .lte("start_time", now.toISOString())
        .or(`end_time.is.null,end_time.gte.${now.toISOString()}`);
    } else {
      totalCountQuery.gte("start_time", now.toISOString());
    }

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

    // Get registration counts for paginated events
    const eventIds = paginatedEvents.map((e: any) => e.id);
    let registrationCounts: Record<string, number> = {};

    if (eventIds.length > 0) {
      const { data: registrations } = await supabase
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds);

      registrationCounts = (registrations || []).reduce(
        (acc, reg) => {
          acc[reg.event_id] = (acc[reg.event_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }

    // Add registration_count to each event
    const eventsWithCounts = paginatedEvents.map((event: any) => ({
      ...event,
      registration_count: registrationCounts[event.id] || 0,
    }));

    console.log("[Browse Events] Final result:", {
      paginatedCount: eventsWithCounts.length,
      filteredCount,
      totalCount,
    });

    return NextResponse.json({
      events: eventsWithCounts,
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

