import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * DELETE /api/events/by-slug/[slug]/deregister
 * Allow an attendee to deregister themselves from an event
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get event by slug
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("slug", params.slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Find attendee by user_id or email
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (!attendee) {
      return NextResponse.json(
        { error: "Attendee profile not found" },
        { status: 404 }
      );
    }

    // Check if registered for event
    const { data: registration } = await serviceSupabase
      .from("registrations")
      .select("id")
      .eq("attendee_id", attendee.id)
      .eq("event_id", event.id)
      .single();

    if (!registration) {
      return NextResponse.json(
        { error: "You are not registered for this event" },
        { status: 404 }
      );
    }

    // Delete the registration (this will cascade to checkins due to ON DELETE CASCADE)
    const { error: deleteError } = await serviceSupabase
      .from("registrations")
      .delete()
      .eq("id", registration.id);

    if (deleteError) {
      console.error("Error deleting registration:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deregistering:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deregister" },
      { status: 500 }
    );
  }
}

