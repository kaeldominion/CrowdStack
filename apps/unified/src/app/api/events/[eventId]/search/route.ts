import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/events/[eventId]/search
 * Search for attendees registered to this event
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get user - support localhost dev mode
    const { data: { user } } = await supabase.auth.getUser();

    // SECURITY: Only allow localhost fallback in non-production environments
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        console.warn("[Search API] Using localhost_user_id fallback - DEV ONLY");
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const showAll = searchParams.get("all") === "true";

    // If no query and not showing all, return empty
    if (!query && !showAll) {
      return NextResponse.json({ results: [] });
    }

    console.log(`[Search API] Searching for "${query}" in event ${eventId}`);

    // First, get total registration count to determine if we need stricter matching
    const { count: totalRegistrations } = await serviceSupabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    const isLargeEvent = (totalRegistrations || 0) > 1000;

    // Build query with proper database-level filtering
    // First, get all registrations for the event, then filter by attendee fields
    let queryBuilder = serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        attendee:attendees(id, name, surname, email, phone)
      `)
      .eq("event_id", eventId);

    // If query provided, we need to search attendees first, then get their registrations
    if (query && !showAll) {
      const searchTerm = query.trim();
      
      // For large events, require minimum query length
      if (isLargeEvent && searchTerm.length < 3) {
        return NextResponse.json({ results: [] });
      }

      // Search attendees table directly, then get their registrations for this event
      const attendeeSearchBuilder = serviceSupabase
        .from("attendees")
        .select("id, name, surname, email, phone")
        .or(`name.ilike.%${searchTerm}%,surname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

      // For large events, try "starts with" first
      if (isLargeEvent) {
        const startsWithBuilder = serviceSupabase
          .from("attendees")
          .select("id, name, surname, email, phone")
          .or(`name.ilike.${searchTerm}%,surname.ilike.${searchTerm}%,email.ilike.${searchTerm}%,phone.ilike.${searchTerm}%`)
          .limit(50);

        const { data: startsWithAttendees } = await startsWithBuilder;

        if (startsWithAttendees && startsWithAttendees.length > 0) {
          const attendeeIds = startsWithAttendees.map(a => a.id);
          queryBuilder = queryBuilder.in("attendee_id", attendeeIds).limit(50);
        } else if (searchTerm.length < 4) {
          // For large events with short queries, only return if we have starts-with matches
          return NextResponse.json({ results: [] });
        } else {
          // Use fuzzy matching but limit strictly
          const { data: fuzzyAttendees } = await attendeeSearchBuilder.limit(50);
          if (fuzzyAttendees && fuzzyAttendees.length > 0) {
            const attendeeIds = fuzzyAttendees.map(a => a.id);
            queryBuilder = queryBuilder.in("attendee_id", attendeeIds).limit(50);
          } else {
            return NextResponse.json({ results: [] });
          }
        }
      } else {
        // For smaller events, use fuzzy matching with more results
        const { data: matchingAttendees } = await attendeeSearchBuilder.limit(100);
        if (matchingAttendees && matchingAttendees.length > 0) {
          const attendeeIds = matchingAttendees.map(a => a.id);
          queryBuilder = queryBuilder.in("attendee_id", attendeeIds).limit(100);
        } else {
          return NextResponse.json({ results: [] });
        }
      }
    } else if (showAll) {
      // Show all registrations (limited)
      queryBuilder = queryBuilder.limit(500);
    } else {
      // No query and not showing all
      return NextResponse.json({ results: [] });
    }

    const { data: registrations, error } = await queryBuilder;

    if (error) {
      console.error("[Search API] Error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Additional client-side filtering for exact matches (prioritize exact matches)
    let filtered = registrations || [];
    if (query && !showAll) {
      const searchLower = query.toLowerCase().trim();
      const exactMatches: typeof filtered = [];
      const startsWithMatches: typeof filtered = [];
      const fuzzyMatches: typeof filtered = [];
      
      filtered.forEach((reg) => {
        const attendee = Array.isArray(reg.attendee) ? reg.attendee[0] : reg.attendee;
        if (!attendee) return;
        
        const nameMatch = attendee.name?.toLowerCase();
        const surnameMatch = attendee.surname?.toLowerCase();
        const fullNameMatch = attendee.surname 
          ? `${attendee.name || ""} ${attendee.surname}`.toLowerCase().trim()
          : nameMatch;
        const emailMatch = attendee.email?.toLowerCase();
        const phoneMatch = attendee.phone;
        
        // Check for exact matches first
        const isExactMatch = 
          nameMatch === searchLower ||
          surnameMatch === searchLower ||
          fullNameMatch === searchLower ||
          emailMatch === searchLower ||
          phoneMatch === query.trim();
        
        // Check for "starts with" matches (better than fuzzy)
        const startsWith = 
          nameMatch?.startsWith(searchLower) ||
          surnameMatch?.startsWith(searchLower) ||
          fullNameMatch?.startsWith(searchLower) ||
          emailMatch?.startsWith(searchLower) ||
          phoneMatch?.startsWith(query.trim());
        
        // Check for fuzzy matches (contains)
        const isFuzzyMatch = 
          nameMatch?.includes(searchLower) ||
          surnameMatch?.includes(searchLower) ||
          fullNameMatch?.includes(searchLower) ||
          emailMatch?.includes(searchLower) ||
          phoneMatch?.includes(query.trim());
        
        if (isExactMatch) {
          exactMatches.push(reg);
        } else if (startsWith) {
          startsWithMatches.push(reg);
        } else if (isFuzzyMatch) {
          fuzzyMatches.push(reg);
        }
      });
      
      // Prioritize: exact matches, then starts-with, then fuzzy
      // For large events, only return if we have good matches
      if (isLargeEvent) {
        if (exactMatches.length > 0 || startsWithMatches.length > 0) {
          filtered = [...exactMatches, ...startsWithMatches];
        } else if (fuzzyMatches.length <= 20) {
          // Only return fuzzy matches if there are few of them
          filtered = fuzzyMatches;
        } else {
          // Too many fuzzy matches for large event - return empty
          filtered = [];
        }
      } else {
        // For smaller events, return all matches
        filtered = [...exactMatches, ...startsWithMatches, ...fuzzyMatches];
      }
    }

    // Get check-in status for each
    const registrationIds = filtered.map((r) => r.id);
    const { data: checkins } = await serviceSupabase
      .from("checkins")
      .select("registration_id")
      .in("registration_id", registrationIds);

    const checkedInIds = new Set(checkins?.map((c) => c.registration_id) || []);

    // Get event details for VIP lookup
    const { data: event } = await serviceSupabase
      .from("events")
      .select("venue_id, organizer_id")
      .eq("id", eventId)
      .single();

    // Get attendee IDs for VIP lookup
    const attendeeIds = filtered
      .map((reg) => {
        const attendee = Array.isArray(reg.attendee) ? reg.attendee[0] : reg.attendee;
        return attendee?.id;
      })
      .filter(Boolean);

    // Fetch VIP status
    const { data: globalVips } = attendeeIds.length > 0
      ? await serviceSupabase
          .from("attendees")
          .select("id, is_global_vip")
          .in("id", attendeeIds)
          .eq("is_global_vip", true)
      : { data: [] };

    const { data: venueVips } = event?.venue_id && attendeeIds.length > 0
      ? await serviceSupabase
          .from("venue_vips")
          .select("attendee_id")
          .eq("venue_id", event.venue_id)
          .in("attendee_id", attendeeIds)
      : { data: [] };

    const { data: organizerVips } = event?.organizer_id && attendeeIds.length > 0
      ? await serviceSupabase
          .from("organizer_vips")
          .select("attendee_id")
          .eq("organizer_id", event.organizer_id)
          .in("attendee_id", attendeeIds)
      : { data: [] };

    const globalVipSet = new Set(globalVips?.map((a) => a.id) || []);
    const venueVipSet = new Set(venueVips?.map((v) => v.attendee_id) || []);
    const organizerVipSet = new Set(organizerVips?.map((o) => o.attendee_id) || []);

    const results = filtered.map((reg) => {
      const attendee = Array.isArray(reg.attendee) ? reg.attendee[0] : reg.attendee;
      const attendeeId = attendee?.id || null;
      const attendeeName = attendee?.surname 
        ? `${attendee?.name || ""} ${attendee.surname}`.trim() 
        : attendee?.name || "Unknown";
      return {
        registration_id: reg.id,
        attendee_id: attendeeId,
        attendee_name: attendeeName,
        attendee_email: attendee?.email || null,
        attendee_phone: attendee?.phone || null,
        checked_in: checkedInIds.has(reg.id),
        is_global_vip: attendeeId ? globalVipSet.has(attendeeId) : false,
        is_venue_vip: attendeeId ? venueVipSet.has(attendeeId) : false,
        is_organizer_vip: attendeeId ? organizerVipSet.has(attendeeId) : false,
      };
    });

    console.log(`[Search API] Found ${results.length} results`);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
