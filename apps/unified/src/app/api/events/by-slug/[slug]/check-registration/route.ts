import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/events/by-slug/[slug]/check-registration
 * Check if current user is already registered for this event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ registered: false });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get event by slug
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return NextResponse.json({ registered: false });
    }

    // Find attendee by user_id or email
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id, name, email")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (!attendee) {
      return NextResponse.json({ registered: false });
    }

    // Check if registered for event
    const { data: registration } = await serviceSupabase
      .from("registrations")
      .select("id")
      .eq("attendee_id", attendee.id)
      .eq("event_id", event.id)
      .single();

    if (!registration) {
      return NextResponse.json({ registered: false });
    }

    // Get event details with venue
    const { data: eventDetails } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        venue_id,
        flier_url,
        show_photo_email_notice
      `)
      .eq("id", event.id)
      .single();

    let venue = null;
    if (eventDetails?.venue_id) {
      const { data: venueData } = await serviceSupabase
        .from("venues")
        .select("id, name, slug")
        .eq("id", eventDetails.venue_id)
        .single();
      venue = venueData;
    }

    // Generate QR pass token
    const { generateQRPassToken } = await import("@crowdstack/shared/qr/generate");
    const qrToken = generateQRPassToken(
      registration.id,
      event.id,
      attendee.id
    );

    return NextResponse.json({
      registered: true,
      qr_pass_token: qrToken,
      attendee: {
        id: attendee.id,
        name: attendee.name || attendee.email?.split("@")[0] || "Guest",
      },
      event: eventDetails ? {
        id: eventDetails.id,
        name: eventDetails.name,
        slug: eventDetails.slug,
        start_time: eventDetails.start_time,
        flier_url: eventDetails.flier_url,
        venue: venue ? { id: venue.id, name: venue.name, slug: venue.slug } : null,
        end_time: eventDetails.end_time,
        show_photo_email_notice: eventDetails.show_photo_email_notice || false,
      } : null,
    });
  } catch (error: any) {
    console.error("Error checking registration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check registration" },
      { status: 500 }
    );
  }
}

