import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

export interface TableBookingResponse {
  id: string;
  event_id: string;
  table_id: string;
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  party_size: number;
  special_requests: string | null;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  deposit_required: number | null;
  deposit_received: boolean;
  deposit_received_at: string | null;
  minimum_spend: number | null;
  actual_spend: number | null;
  staff_notes: string | null;
  promoter_id: string | null;
  referral_code: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  table: {
    id: string;
    name: string;
    capacity: number;
    zone: {
      id: string;
      name: string;
    };
  };
  promoter?: {
    id: string;
    name: string | null;
    slug: string | null;
  } | null;
}

/**
 * GET /api/venue/events/[eventId]/bookings
 * Get all table bookings for a specific event
 *
 * Query params:
 * - status: filter by booking status (optional)
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

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { eventId } = params;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, currency")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get venue currency
    const { data: venue } = await serviceSupabase
      .from("venues")
      .select("currency")
      .eq("id", venueId)
      .single();

    const effectiveCurrency = event.currency || venue?.currency || "USD";

    // Build query for bookings
    let query = serviceSupabase
      .from("table_bookings")
      .select(`
        *,
        table:venue_tables(
          id,
          name,
          capacity,
          zone:table_zones(id, name)
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    // Get promoter info for bookings with promoter_id
    const promoterIds = [...new Set(bookings?.filter(b => b.promoter_id).map(b => b.promoter_id))];
    let promoterMap: Record<string, { id: string; name: string | null; slug: string | null }> = {};

    if (promoterIds.length > 0) {
      const { data: promoters } = await serviceSupabase
        .from("promoters")
        .select("id, name, slug")
        .in("id", promoterIds);

      if (promoters) {
        promoterMap = Object.fromEntries(promoters.map(p => [p.id, p]));
      }
    }

    // Enhance bookings with promoter info
    const enhancedBookings = (bookings || []).map(booking => ({
      ...booking,
      promoter: booking.promoter_id ? promoterMap[booking.promoter_id] || null : null,
    }));

    // Calculate summary stats
    const summary = {
      total: enhancedBookings.length,
      pending: enhancedBookings.filter(b => b.status === "pending").length,
      confirmed: enhancedBookings.filter(b => b.status === "confirmed").length,
      cancelled: enhancedBookings.filter(b => b.status === "cancelled").length,
      no_show: enhancedBookings.filter(b => b.status === "no_show").length,
      completed: enhancedBookings.filter(b => b.status === "completed").length,
    };

    // Get all tables for the venue (for change table dropdown)
    const { data: allTables } = await serviceSupabase
      .from("venue_tables")
      .select(`
        id,
        name,
        capacity,
        is_active,
        zone:table_zones(id, name)
      `)
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    return NextResponse.json({
      bookings: enhancedBookings,
      summary,
      currency: effectiveCurrency,
      allTables: allTables || [],
    });
  } catch (error: any) {
    console.error("Error in bookings GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
