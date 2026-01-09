import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

export interface OrganizerEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status: string;
  venue_name: string | null;
  registrations: number;
  checkins: number;
  capacity: number | null;
  flier_url: string | null;
}


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events for this organizer
    const { data: events, error } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        status,
        venue_approval_status,
        capacity,
        flier_url,
        venue:venues(name)
      `)
      .eq("organizer_id", organizerId)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("[OrganizerDashboardEvents] Query error:", error);
      throw error;
    }

    const now = new Date();
    const liveEvents: OrganizerEvent[] = [];
    const upcomingEvents: OrganizerEvent[] = [];
    const pastEvents: OrganizerEvent[] = [];

    // BATCH QUERY OPTIMIZATION: Get all counts in bulk instead of per-event
    const eventIds = (events || []).map((e) => e.id);

    // Batch fetch all registrations for these events
    const { data: allRegs } = eventIds.length > 0
      ? await serviceSupabase
          .from("registrations")
          .select("event_id, checked_in")
          .in("event_id", eventIds)
      : { data: [] };

    // Build counts maps for O(1) lookups
    const regsByEvent = new Map<string, number>();
    const checkinsByEvent = new Map<string, number>();

    (allRegs || []).forEach((reg) => {
      regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
      if (reg.checked_in) {
        checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
      }
    });

    // Process events using pre-computed maps (no additional queries)
    for (const event of events || []) {
      const eventData: OrganizerEvent = {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        status: event.status,
        venue_approval_status: event.venue_approval_status,
        venue_name: Array.isArray(event.venue) ? event.venue[0]?.name : (event.venue as any)?.name || null,
        registrations: regsByEvent.get(event.id) || 0,
        checkins: checkinsByEvent.get(event.id) || 0,
        capacity: event.capacity,
        flier_url: event.flier_url,
      };

      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // Check if event is live
      if (startTime <= now && (!endTime || endTime >= now) && event.status === "published") {
        liveEvents.push(eventData);
      }
      // Check if event is upcoming
      else if (startTime > now && event.status === "published") {
        upcomingEvents.push(eventData);
      }
      // Past events
      else if (startTime < now || event.status === "completed") {
        pastEvents.push(eventData);
      }
      // Draft or pending events go to upcoming for visibility
      else {
        upcomingEvents.push(eventData);
      }
    }

    // Sort upcoming by start time ascending (soonest first)
    upcomingEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    // Sort past by start time descending (most recent first)
    pastEvents.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return NextResponse.json({
      liveEvents,
      upcomingEvents,
      pastEvents,
    });
  } catch (error: any) {
    console.error("[OrganizerDashboardEvents] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizer events" },
      { status: 500 }
    );
  }
}

