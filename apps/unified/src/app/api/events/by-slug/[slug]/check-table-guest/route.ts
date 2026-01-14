import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/events/by-slug/[slug]/check-table-guest
 * Check if current user has a table party guest entry for this event
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ hasTableGuest: false });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get event by slug
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("slug", params.slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ hasTableGuest: false });
    }

    // Find attendee by user_id
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!attendee) {
      return NextResponse.json({ hasTableGuest: false });
    }

    // Check for table party guest entry for this event
    // First get all bookings for this event
    const { data: bookings } = await serviceSupabase
      .from("table_bookings")
      .select("id")
      .eq("event_id", event.id);

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ hasTableGuest: false });
    }

    const bookingIds = bookings.map(b => b.id);

    // Now check if user has a guest entry for any of these bookings
    const { data: tableGuest } = await serviceSupabase
      .from("table_party_guests")
      .select("id")
      .eq("attendee_id", attendee.id)
      .eq("status", "joined")
      .in("booking_id", bookingIds)
      .limit(1)
      .single();

    if (!tableGuest) {
      return NextResponse.json({ hasTableGuest: false });
    }

    return NextResponse.json({
      hasTableGuest: true,
      guestId: tableGuest.id,
    });
  } catch (error: any) {
    console.error("Error checking table guest:", error);
    return NextResponse.json({ hasTableGuest: false });
  }
}
