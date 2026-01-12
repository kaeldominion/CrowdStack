import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/table-bookings
 * Get all table bookings across all events for the venue
 *
 * Query params:
 * - status: filter by status (pending, confirmed, cancelled, no_show, completed, all)
 * - event_id: filter by specific event
 * - upcoming_only: if true, only show bookings for future/ongoing events
 * - limit: number of results (default 50)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try to get venue from query param (for superadmins) or from user assignment
    const { searchParams } = new URL(request.url);
    let venueId = searchParams.get("venue_id");

    if (!venueId) {
      venueId = await getUserVenueId();
    }

    if (!venueId) {
      return NextResponse.json({
        error: "No venue found. Please ensure you are assigned to a venue or pass venue_id parameter."
      }, { status: 404 });
    }

    const status = searchParams.get("status") || "all";
    const eventId = searchParams.get("event_id");
    const upcomingOnly = searchParams.get("upcoming_only") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const serviceSupabase = createServiceRoleClient();

    // Get venue currency
    const { data: venue } = await serviceSupabase
      .from("venues")
      .select("currency")
      .eq("id", venueId)
      .single();

    // First get all event IDs for this venue
    const { data: venueEvents } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("venue_id", venueId);

    const eventIds = venueEvents?.map(e => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({
        bookings: [],
        summary: { total: 0, pending: 0, confirmed: 0, cancelled: 0, no_show: 0, completed: 0 },
        events: [],
        currency: venue?.currency || "USD",
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    // Build query for bookings using event IDs
    // Filter out archived bookings by default
    const includeArchived = searchParams.get("include_archived") === "true";

    let query = serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        status,
        guest_name,
        guest_email,
        guest_whatsapp,
        party_size,
        special_requests,
        deposit_required,
        deposit_received,
        minimum_spend,
        actual_spend,
        staff_notes,
        promoter_id,
        archived_at,
        created_at,
        updated_at,
        event:events(
          id,
          name,
          slug,
          start_time,
          end_time,
          venue_id,
          currency
        ),
        table:venue_tables(
          id,
          name,
          capacity,
          zone:table_zones(id, name)
        ),
        promoter:promoters(id, name, slug)
      `, { count: "exact" })
      .in("event_id", eventIds);

    // Filter out archived bookings unless explicitly requested
    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    // Filter by status
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Filter by event
    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    // Filter for upcoming/ongoing events only
    if (upcomingOnly) {
      // Get events that are either:
      // 1. Starting in the future (start_time >= now)
      // 2. Currently ongoing (end_time >= now OR end_time is null and start_time was within last 24 hours)
      const now = new Date().toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get future events
      const { data: futureEvents } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("venue_id", venueId)
        .gte("start_time", now);

      // Get ongoing events (started but not yet ended)
      const { data: ongoingEvents } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("venue_id", venueId)
        .lt("start_time", now)
        .gte("end_time", now);

      // Get recent events with no end_time (assume they could still be ongoing)
      const { data: recentNoEndEvents } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("venue_id", venueId)
        .is("end_time", null)
        .gte("start_time", oneDayAgo)
        .lt("start_time", now);

      const upcomingEventIds = [
        ...(futureEvents?.map(e => e.id) || []),
        ...(ongoingEvents?.map(e => e.id) || []),
        ...(recentNoEndEvents?.map(e => e.id) || []),
      ];

      // Remove duplicates
      const uniqueEventIds = [...new Set(upcomingEventIds)];

      if (uniqueEventIds.length > 0) {
        query = query.in("event_id", uniqueEventIds);
      } else {
        return NextResponse.json({
          bookings: [],
          summary: { total: 0, pending: 0, confirmed: 0, cancelled: 0, no_show: 0, completed: 0 },
          events: [],
          currency: venue?.currency || "USD",
          pagination: { total: 0, limit, offset, hasMore: false },
        });
      }
    }

    // Order by event date, then by created_at
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error("Error fetching table bookings:", error);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    // CRITICAL: Get authoritative status values separately to avoid PostgREST field collision
    // (events table also has a "status" column that can interfere with nested selects)
    let bookingsWithAuthoritativeStatus = bookings || [];
    if (bookings && bookings.length > 0) {
      const bookingIds = bookings.map(b => b.id);
      const { data: statusData } = await serviceSupabase
        .from("table_bookings")
        .select("id, status")
        .in("id", bookingIds);

      if (statusData) {
        const statusMap = new Map(statusData.map(s => [s.id, s.status]));
        bookingsWithAuthoritativeStatus = bookings.map(b => ({
          ...b,
          status: statusMap.get(b.id) || b.status, // Use authoritative status
        }));
      }

      // Fetch party guest counts for all bookings
      const { data: partyGuests } = await serviceSupabase
        .from("table_party_guests")
        .select("booking_id, status, checked_in")
        .in("booking_id", bookingIds);

      // Build counts map: { booking_id: { joined: X, checked_in: Y } }
      const guestCountsMap = new Map<string, { joined: number; checked_in: number }>();
      (partyGuests || []).forEach((guest) => {
        if (!guestCountsMap.has(guest.booking_id)) {
          guestCountsMap.set(guest.booking_id, { joined: 0, checked_in: 0 });
        }
        const counts = guestCountsMap.get(guest.booking_id)!;
        if (guest.status === "joined") {
          counts.joined++;
          if (guest.checked_in) {
            counts.checked_in++;
          }
        }
      });

      // Add guest counts to each booking
      bookingsWithAuthoritativeStatus = bookingsWithAuthoritativeStatus.map(b => ({
        ...b,
        guests_joined: guestCountsMap.get(b.id)?.joined || 0,
        guests_checked_in: guestCountsMap.get(b.id)?.checked_in || 0,
      }));
    }

    // Get summary counts using event IDs (all non-archived bookings)
    let summaryQuery = serviceSupabase
      .from("table_bookings")
      .select("status")
      .in("event_id", eventIds)
      .is("archived_at", null);

    const { data: summaryData } = await summaryQuery;

    const summary = {
      total: summaryData?.length || 0,
      pending: summaryData?.filter(b => b.status === "pending").length || 0,
      confirmed: summaryData?.filter(b => b.status === "confirmed").length || 0,
      cancelled: summaryData?.filter(b => b.status === "cancelled").length || 0,
      no_show: summaryData?.filter(b => b.status === "no_show").length || 0,
      completed: summaryData?.filter(b => b.status === "completed").length || 0,
    };

    // Get upcoming events with table bookings enabled for the filter dropdown
    const { data: eventsData } = await serviceSupabase
      .from("events")
      .select("id, name, start_time, table_booking_mode")
      .eq("venue_id", venueId)
      .neq("table_booking_mode", "disabled")
      .gte("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days + future
      .order("start_time", { ascending: true })
      .limit(50);

    return NextResponse.json({
      bookings: bookingsWithAuthoritativeStatus, // Use authoritative status values
      summary,
      events: eventsData || [],
      currency: venue?.currency || "USD",
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    console.error("Error in venue table-bookings GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
