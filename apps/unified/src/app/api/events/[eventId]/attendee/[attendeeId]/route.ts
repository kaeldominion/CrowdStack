import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; attendeeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get attendee details
    const { data: attendee, error: attendeeError } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("id", params.attendeeId)
      .single();

    if (attendeeError || !attendee) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    // Get registration for this event
    const { data: registration } = await serviceSupabase
      .from("registrations")
      .select("id, registered_at, referral_promoter_id")
      .eq("attendee_id", params.attendeeId)
      .eq("event_id", params.eventId)
      .single();

    // Get check-in if exists
    let checkin = null;
    if (registration) {
      const { data: checkinData } = await serviceSupabase
        .from("checkins")
        .select("id, checked_in_at, checked_in_by")
        .eq("registration_id", registration.id)
        .single();
      checkin = checkinData;
    }

    // Get previous events this attendee has attended (at any venue)
    const { data: previousEvents } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        registered_at,
        event:events(id, name, start_time),
        checkins(checked_in_at)
      `)
      .eq("attendee_id", params.attendeeId)
      .neq("event_id", params.eventId)
      .order("registered_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      attendee: {
        id: attendee.id,
        name: attendee.name,
        surname: attendee.surname,
        email: attendee.email,
        phone: attendee.phone,
        whatsapp: attendee.whatsapp,
        instagram_handle: attendee.instagram_handle,
        tiktok_handle: attendee.tiktok_handle,
        avatar_url: attendee.avatar_url,
        date_of_birth: attendee.date_of_birth,
        created_at: attendee.created_at,
      },
      registration,
      checkin,
      previous_events: previousEvents?.map(pe => ({
        id: (pe.event as any)?.id,
        name: (pe.event as any)?.name,
        date: (pe.event as any)?.start_time,
        attended: (pe.checkins as any[])?.length > 0,
      })) || [],
    });
  } catch (error: any) {
    console.error("[Attendee API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

