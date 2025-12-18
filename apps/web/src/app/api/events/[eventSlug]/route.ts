import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const supabase = createServiceRoleClient();

    // Get published event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        organizer:organizers(id, name),
        venue:venues(id, name, address, city, state, country)
      `)
      .eq("slug", params.eventSlug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Get registration count
    const { count: registrationCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    return NextResponse.json({
      event: {
        ...event,
        registration_count: registrationCount || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

