import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/events/[eventId]/closeout/summary
 * Get closeout summary and status for an event
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

    // Verify event belongs to venue and get closeout status
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, tables_closeout_at, tables_closeout_by, currency")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get venue currency if not set on event
    const { data: venue } = await serviceSupabase
      .from("venues")
      .select("currency, table_commission_rate")
      .eq("id", venueId)
      .single();

    const currency = event.currency || venue?.currency || "USD";

    // Get bookings summary
    const { data: bookings, error: bookingsError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        guest_name,
        actual_spend,
        minimum_spend,
        status,
        closeout_locked,
        promoter_id,
        table:venue_tables(name)
      `)
      .eq("event_id", eventId)
      .in("status", ["confirmed", "completed"]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    // Get existing commissions
    const { data: commissions, error: commissionsError } = await serviceSupabase
      .from("table_booking_commissions")
      .select(`
        booking_id,
        spend_amount,
        spend_source,
        promoter_id,
        promoter_commission_rate,
        promoter_commission_amount,
        venue_commission_rate,
        venue_commission_amount,
        locked
      `)
      .eq("event_id", eventId);

    // Build commission map
    const commissionMap = new Map<string, any>();
    if (commissions) {
      for (const c of commissions) {
        commissionMap.set(c.booking_id, c);
      }
    }

    // Calculate summary
    let totalBookings = 0;
    let bookingsWithActualSpend = 0;
    let bookingsWithMinimumSpend = 0;
    let totalActualSpend = 0;
    let totalMinimumSpend = 0;
    let totalPromoterCommission = 0;
    let totalVenueCommission = 0;

    const bookingDetails: Array<{
      id: string;
      guest_name: string;
      table_name: string | null;
      actual_spend: number | null;
      minimum_spend: number | null;
      effective_spend: number;
      spend_source: string;
      promoter_commission: number;
      venue_commission: number;
      has_commission: boolean;
      locked: boolean;
    }> = [];

    for (const booking of bookings || []) {
      totalBookings++;

      const commission = commissionMap.get(booking.id);
      const effectiveSpend = booking.actual_spend ?? booking.minimum_spend ?? 0;
      const spendSource = booking.actual_spend !== null ? "actual" : "minimum";

      if (booking.actual_spend !== null) {
        bookingsWithActualSpend++;
        totalActualSpend += booking.actual_spend;
      } else if (booking.minimum_spend !== null) {
        bookingsWithMinimumSpend++;
        totalMinimumSpend += booking.minimum_spend;
      }

      const promoterCommission = commission?.promoter_commission_amount || 0;
      const venueCommission = commission?.venue_commission_amount || 0;

      totalPromoterCommission += promoterCommission;
      totalVenueCommission += venueCommission;

      bookingDetails.push({
        id: booking.id,
        guest_name: booking.guest_name,
        table_name: (booking.table as any)?.[0]?.name || (booking.table as any)?.name || null,
        actual_spend: booking.actual_spend,
        minimum_spend: booking.minimum_spend,
        effective_spend: effectiveSpend,
        spend_source: spendSource,
        promoter_commission: promoterCommission,
        venue_commission: venueCommission,
        has_commission: !!commission,
        locked: booking.closeout_locked || false,
      });
    }

    // Get promoter breakdown
    const promoterBreakdown: Array<{
      promoter_id: string;
      promoter_name?: string;
      booking_count: number;
      total_spend: number;
      total_commission: number;
    }> = [];

    const promoterMap = new Map<string, { booking_count: number; total_spend: number; total_commission: number }>();

    for (const detail of bookingDetails) {
      const commission = commissionMap.get(detail.id);
      if (commission?.promoter_id) {
        const existing = promoterMap.get(commission.promoter_id) || {
          booking_count: 0,
          total_spend: 0,
          total_commission: 0,
        };
        existing.booking_count++;
        existing.total_spend += detail.effective_spend;
        existing.total_commission += commission.promoter_commission_amount || 0;
        promoterMap.set(commission.promoter_id, existing);
      }
    }

    // Get promoter names
    const promoterIds = Array.from(promoterMap.keys());
    let promoterNames = new Map<string, string>();

    if (promoterIds.length > 0) {
      const { data: promoters } = await serviceSupabase
        .from("promoters")
        .select("id, name")
        .in("id", promoterIds);

      if (promoters) {
        for (const p of promoters) {
          promoterNames.set(p.id, p.name || "Unknown Promoter");
        }
      }
    }

    for (const [promoterId, data] of promoterMap.entries()) {
      promoterBreakdown.push({
        promoter_id: promoterId,
        promoter_name: promoterNames.get(promoterId) || "Unknown Promoter",
        ...data,
      });
    }

    // Get import history
    const { data: imports } = await serviceSupabase
      .from("table_closeout_imports")
      .select("id, filename, import_type, row_count, matched_count, status, imported_at, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      status: {
        is_locked: !!event.tables_closeout_at,
        locked_at: event.tables_closeout_at,
        locked_by: event.tables_closeout_by,
      },
      summary: {
        total_bookings: totalBookings,
        bookings_with_actual_spend: bookingsWithActualSpend,
        bookings_with_minimum_spend_only: bookingsWithMinimumSpend,
        bookings_without_spend: totalBookings - bookingsWithActualSpend - bookingsWithMinimumSpend,
        total_spend: Math.round((totalActualSpend + totalMinimumSpend) * 100) / 100,
        total_actual_spend: Math.round(totalActualSpend * 100) / 100,
        total_minimum_spend: Math.round(totalMinimumSpend * 100) / 100,
        total_promoter_commission: Math.round(totalPromoterCommission * 100) / 100,
        total_venue_commission: Math.round(totalVenueCommission * 100) / 100,
        venue_commission_rate: venue?.table_commission_rate || 10,
      },
      currency,
      bookings: bookingDetails,
      promoter_breakdown: promoterBreakdown,
      imports: imports || [],
    });
  } catch (error: any) {
    console.error("Error in closeout summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch closeout summary" },
      { status: 500 }
    );
  }
}
