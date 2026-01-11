import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/events/[eventId]/commissions
 * Get all commission records for an event
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
    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to venue
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, name, tables_closeout_at, currency")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get all commissions with booking and promoter details
    const { data: commissions, error: commissionsError } = await serviceSupabase
      .from("table_booking_commissions")
      .select(`
        id,
        booking_id,
        event_id,
        spend_amount,
        spend_source,
        promoter_id,
        promoter_commission_rate,
        promoter_commission_amount,
        venue_commission_rate,
        venue_commission_amount,
        locked,
        locked_at,
        created_at,
        updated_at
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (commissionsError) {
      console.error("Error fetching commissions:", commissionsError);
      return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
    }

    // Get booking details for each commission
    const bookingIds = commissions?.map((c) => c.booking_id) || [];
    let bookingsMap = new Map<string, any>();

    if (bookingIds.length > 0) {
      const { data: bookings } = await serviceSupabase
        .from("table_bookings")
        .select(`
          id,
          guest_name,
          guest_email,
          status,
          table:venue_tables(id, name)
        `)
        .in("id", bookingIds);

      if (bookings) {
        for (const b of bookings) {
          bookingsMap.set(b.id, b);
        }
      }
    }

    // Get promoter details
    const promoterIds = [...new Set(commissions?.filter((c) => c.promoter_id).map((c) => c.promoter_id!) || [])];
    let promotersMap = new Map<string, any>();

    if (promoterIds.length > 0) {
      const { data: promoters } = await serviceSupabase
        .from("promoters")
        .select("id, name, slug")
        .in("id", promoterIds);

      if (promoters) {
        for (const p of promoters) {
          promotersMap.set(p.id, p);
        }
      }
    }

    // Build enhanced commission records
    const enhancedCommissions = (commissions || []).map((c) => {
      const booking = bookingsMap.get(c.booking_id);
      const promoter = c.promoter_id ? promotersMap.get(c.promoter_id) : null;

      return {
        ...c,
        booking: booking
          ? {
              guest_name: booking.guest_name,
              guest_email: booking.guest_email,
              status: booking.status,
              table_name: booking.table?.name || null,
            }
          : null,
        promoter: promoter
          ? {
              id: promoter.id,
              name: promoter.name,
              slug: promoter.slug,
            }
          : null,
      };
    });

    // Calculate totals
    let totalSpend = 0;
    let totalPromoterCommission = 0;
    let totalVenueCommission = 0;

    for (const c of commissions || []) {
      totalSpend += c.spend_amount || 0;
      totalPromoterCommission += c.promoter_commission_amount || 0;
      totalVenueCommission += c.venue_commission_amount || 0;
    }

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        is_locked: !!event.tables_closeout_at,
        locked_at: event.tables_closeout_at,
      },
      currency: event.currency || "USD",
      summary: {
        total_commissions: (commissions || []).length,
        total_spend: Math.round(totalSpend * 100) / 100,
        total_promoter_commission: Math.round(totalPromoterCommission * 100) / 100,
        total_venue_commission: Math.round(totalVenueCommission * 100) / 100,
      },
      commissions: enhancedCommissions,
    });
  } catch (error: any) {
    console.error("Error in commissions GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch commissions" },
      { status: 500 }
    );
  }
}
