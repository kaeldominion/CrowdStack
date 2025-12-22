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

    // Get registration and checkin counts for all events
    for (const event of events || []) {
      const { count: registrations } = await serviceSupabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);

      const { count: checkins } = await serviceSupabase
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .is("undo_at", null);

      const eventData: OrganizerEvent = {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        status: event.status,
        venue_approval_status: event.venue_approval_status,
        venue_name: Array.isArray(event.venue) ? event.venue[0]?.name : (event.venue as any)?.name || null,
        registrations: registrations || 0,
        checkins: checkins || 0,
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

