import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/events/[eventId]/booking-links
 * List all booking links for an event (admin access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the event exists
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all booking links for this event
    const { data: links, error: linksError } = await serviceSupabase
      .from("table_booking_links")
      .select(`
        *,
        table:venue_tables(id, name, zone:table_zones(id, name))
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (linksError) {
      console.error("[Admin] Error fetching booking links:", linksError);
      return NextResponse.json({ error: "Failed to fetch booking links" }, { status: 500 });
    }

    return NextResponse.json({
      links: links || [],
    });
  } catch (error: any) {
    console.error("[Admin] Error in booking-links GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch booking links" },
      { status: 500 }
    );
  }
}

interface CreateBookingLinkRequest {
  table_id?: string | null;
  expires_at?: string | null;
}

/**
 * POST /api/admin/events/[eventId]/booking-links
 * Create a new booking link (admin access)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = params;
    const body: CreateBookingLinkRequest = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Get event with venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const venueId = event.venue_id;

    // If table_id provided, verify it belongs to the venue
    if (body.table_id) {
      const { data: table } = await serviceSupabase
        .from("venue_tables")
        .select("id")
        .eq("id", body.table_id)
        .eq("venue_id", venueId)
        .single();

      if (!table) {
        return NextResponse.json({ error: "Invalid table" }, { status: 400 });
      }
    }

    // Generate unique code
    const code = nanoid(8).toUpperCase();

    // Create the booking link
    const { data: link, error: createError } = await serviceSupabase
      .from("table_booking_links")
      .insert({
        event_id: eventId,
        table_id: body.table_id || null,
        code,
        is_active: true,
        created_by: userId,
        expires_at: body.expires_at || null,
      })
      .select(`
        *,
        table:venue_tables(id, name, zone:table_zones(id, name))
      `)
      .single();

    if (createError) {
      console.error("[Admin] Error creating booking link:", createError);
      return NextResponse.json({ error: "Failed to create booking link" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error: any) {
    console.error("[Admin] Error in booking-links POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create booking link" },
      { status: 500 }
    );
  }
}
