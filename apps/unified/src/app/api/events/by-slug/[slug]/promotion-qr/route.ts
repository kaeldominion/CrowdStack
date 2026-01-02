import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * Get promotion QR code for an event
 * Returns a URL with ref parameter that attributes registrations to organizer/venue
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();
    
    // Get event by slug
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        slug,
        organizer_id,
        venue_id
      `)
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Get organizer details
    let organizerCreatedBy: string | null = null;
    if (event.organizer_id) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("created_by")
        .eq("id", event.organizer_id)
        .single();
      
      if (organizer) {
        organizerCreatedBy = organizer.created_by;
      }
    }

    // Get venue details
    let venueCreatedBy: string | null = null;
    if (event.venue_id) {
      const { data: venue } = await serviceSupabase
        .from("venues")
        .select("created_by")
        .eq("id", event.venue_id)
        .single();
      
      if (venue) {
        venueCreatedBy = venue.created_by;
      }
    }

    // Determine promoter ID for attribution (organizer first, then venue)
    let promoterId: string | null = null;
    
    // Try organizer's promoter profile first
    if (organizerCreatedBy) {
      const { data: organizerPromoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("created_by", organizerCreatedBy)
        .single();

      if (organizerPromoter) {
        promoterId = organizerPromoter.id;
      }
    }
    
    // If no organizer promoter, try venue promoter
    if (!promoterId && venueCreatedBy) {
      const { data: venuePromoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("created_by", venueCreatedBy)
        .single();

      if (venuePromoter) {
        promoterId = venuePromoter.id;
      }
    }

    // Build registration URL with ref parameter if we have a promoter ID
    // Get the origin from the request headers
    const origin = request.headers.get("origin") || 
                   request.headers.get("host") ? `https://${request.headers.get("host")}` : 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   "https://crowdstack.app";
    
    let registrationUrl = `${origin}/e/${event.slug}/register`;
    if (promoterId) {
      registrationUrl += `?ref=${promoterId}`;
    }

    return NextResponse.json({
      qr_url: registrationUrl,
      promoter_id: promoterId,
    });
  } catch (error: any) {
    console.error("Error generating promotion QR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate promotion QR" },
      { status: 500 }
    );
  }
}

