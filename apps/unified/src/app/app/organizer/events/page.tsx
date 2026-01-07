import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { OrganizerEventsPageClient } from "./OrganizerEventsPageClient";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status: string;
  venue_rejection_reason: string | null;
  registrations: number;
  checkins: number;
  flier_url: string | null;
  cover_image_url: string | null;
  venue: any | null;
  organizer: any | null;
}

async function getOrganizerEvents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get organizer ID for current user
  const organizerId = await getUserOrganizerId();

  if (!organizerId) {
    return { events: [] };
  }

  const serviceSupabase = createServiceRoleClient();

  // Get events for this organizer
  const { data: events, error } = await serviceSupabase
    .from("events")
    .select(`
      id,
      name,
      slug,
      description,
      start_time,
      end_time,
      status,
      venue_approval_status,
      venue_rejection_reason,
      capacity,
      cover_image_url,
      flier_url,
      created_at,
      venue:venues(id, name, logo_url, cover_image_url, city, state),
      organizer:organizers(id, name, logo_url)
    `)
    .eq("organizer_id", organizerId)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[OrganizerEvents] Query error:", error);
    return { events: [] };
  }

  // Get registration and checkin counts for each event
  const eventIds = events?.map(e => e.id) || [];
  let registrationCounts: Record<string, number> = {};
  let checkinCounts: Record<string, number> = {};

  if (eventIds.length > 0) {
    // Get registrations with their event IDs
    const registrationsResult = await serviceSupabase
      .from("registrations")
      .select("id, event_id")
      .in("event_id", eventIds);

    const registrations = registrationsResult.data || [];
    const registrationIds = registrations.map(reg => reg.id);

    // Count registrations per event
    registrations.forEach((reg: any) => {
      registrationCounts[reg.event_id] = (registrationCounts[reg.event_id] || 0) + 1;
    });

    // Get checkins and map back to events
    if (registrationIds.length > 0) {
      const checkinsResult = await serviceSupabase
        .from("checkins")
        .select("registration_id")
        .in("registration_id", registrationIds);

      const registrationIdToEventId: Record<string, string> = {};
      registrations.forEach((reg: any) => {
        registrationIdToEventId[reg.id] = reg.event_id;
      });

      (checkinsResult.data || []).forEach((checkin: any) => {
        const eventId = registrationIdToEventId[checkin.registration_id];
        if (eventId) {
          checkinCounts[eventId] = (checkinCounts[eventId] || 0) + 1;
        }
      });
    }
  }

  // Add counts to events
  const eventsWithCounts: Event[] = (events || []).map((event) => ({
    ...event,
    registrations: registrationCounts[event.id] || 0,
    checkins: checkinCounts[event.id] || 0,
  }));

  return { events: eventsWithCounts };
}

export default async function OrganizerEventsPage() {
  const { events } = await getOrganizerEvents();

  return <OrganizerEventsPageClient initialEvents={events} />;
}
