import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/vip
 * 
 * Get VIP status for an attendee, optionally scoped to an event
 * 
 * Query params:
 * - attendeeId: UUID of the attendee
 * - eventId: Optional event UUID to check scoped VIP status
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const attendeeId = searchParams.get("attendeeId");
  const eventId = searchParams.get("eventId");

  if (!attendeeId) {
    return NextResponse.json({ error: "attendeeId is required" }, { status: 400 });
  }

  try {
    // Get global VIP status from attendee
    const { data: attendee, error: attendeeError } = await supabase
      .from("attendees")
      .select("id, is_global_vip, global_vip_reason, global_vip_granted_at")
      .eq("id", attendeeId)
      .single();

    if (attendeeError) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    let isVenueVip = false;
    let isOrganizerVip = false;
    let venueName: string | null = null;
    let organizerName: string | null = null;
    let venueVipReason: string | null = null;
    let organizerVipReason: string | null = null;

    // If event context provided, check scoped VIP
    if (eventId) {
      // Get event's venue and organizer
      const { data: event } = await supabase
        .from("events")
        .select("venue_id, organizer_id, venues(name), organizers(name)")
        .eq("id", eventId)
        .single();

      if (event) {
        // Check venue VIP
        if (event.venue_id) {
          const { data: venueVip } = await supabase
            .from("venue_vips")
            .select("reason")
            .eq("venue_id", event.venue_id)
            .eq("attendee_id", attendeeId)
            .single();

          if (venueVip) {
            isVenueVip = true;
            venueVipReason = venueVip.reason;
            // Supabase returns single relations as objects, not arrays
            const venueData = event.venues as unknown as { name: string } | null;
            venueName = venueData?.name || null;
          }
        }

        // Check organizer VIP
        if (event.organizer_id) {
          const { data: organizerVip } = await supabase
            .from("organizer_vips")
            .select("reason")
            .eq("organizer_id", event.organizer_id)
            .eq("attendee_id", attendeeId)
            .single();

          if (organizerVip) {
            isOrganizerVip = true;
            organizerVipReason = organizerVip.reason;
            // Supabase returns single relations as objects, not arrays
            const organizerData = event.organizers as unknown as { name: string } | null;
            organizerName = organizerData?.name || null;
          }
        }
      }
    }

    return NextResponse.json({
      attendeeId,
      isGlobalVip: attendee.is_global_vip || false,
      globalVipReason: attendee.global_vip_reason,
      globalVipGrantedAt: attendee.global_vip_granted_at,
      isVenueVip,
      venueName,
      venueVipReason,
      isOrganizerVip,
      organizerName,
      organizerVipReason,
      vipLevel: attendee.is_global_vip ? "global" : (isVenueVip || isOrganizerVip) ? "scoped" : "none",
    });
  } catch (error) {
    console.error("Error fetching VIP status:", error);
    return NextResponse.json({ error: "Failed to fetch VIP status" }, { status: 500 });
  }
}

