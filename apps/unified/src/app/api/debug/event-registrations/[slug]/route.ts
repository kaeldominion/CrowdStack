import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();
    
    // Get event by slug
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, name, slug, status")
      .eq("slug", params.slug)
      .single();

    if (!event) {
      return NextResponse.json({ 
        error: "Event not found", 
        slug: params.slug,
        eventError: eventError?.message 
      }, { status: 404 });
    }

    // Get all registrations for this event
    const { data: registrations, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        registered_at,
        attendee:attendees(id, name, email, user_id)
      `)
      .eq("event_id", event.id);

    return NextResponse.json({
      event,
      registrations_count: registrations?.length || 0,
      registrations: registrations,
      error: regError?.message,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

