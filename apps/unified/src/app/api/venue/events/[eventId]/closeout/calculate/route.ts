import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

interface BookingForCommission {
  id: string;
  event_id: string;
  promoter_id: string | null;
  actual_spend: number | null;
  minimum_spend: number | null;
  closeout_locked: boolean;
}

interface EventPromoterConfig {
  promoter_id: string;
  commission_rate: number | null;
  table_commission_rate: number | null;
}

/**
 * POST /api/venue/events/[eventId]/closeout/calculate
 * Calculate commissions for all bookings in an event
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
      .select("id, venue_id, tables_closeout_at")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get venue settings for commission rates
    const { data: venue, error: venueError } = await serviceSupabase
      .from("venues")
      .select("table_commission_rate")
      .eq("id", venueId)
      .single();

    if (venueError) {
      console.error("Error fetching venue:", venueError);
      return NextResponse.json({ error: "Failed to fetch venue settings" }, { status: 500 });
    }

    const venueCommissionRate = venue?.table_commission_rate || 10; // Default 10%

    // Get all bookings for this event
    const { data: bookingsData, error: bookingsError } = await serviceSupabase
      .from("table_bookings")
      .select("id, event_id, promoter_id, actual_spend, minimum_spend, closeout_locked")
      .eq("event_id", eventId)
      .in("status", ["confirmed", "completed"]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    const bookings = (bookingsData || []) as BookingForCommission[];

    // Get promoter commission configs for this event
    const promoterIds = [...new Set(bookings.filter((b) => b.promoter_id).map((b) => b.promoter_id!))];
    const promoterConfigs = new Map<string, EventPromoterConfig>();

    if (promoterIds.length > 0) {
      const { data: eventPromoters } = await serviceSupabase
        .from("event_promoters")
        .select("promoter_id, commission_rate, table_commission_rate")
        .eq("event_id", eventId)
        .in("promoter_id", promoterIds);

      if (eventPromoters) {
        for (const ep of eventPromoters) {
          promoterConfigs.set(ep.promoter_id, ep);
        }
      }

      // Also check promoters table for default rates
      const { data: promoters } = await serviceSupabase
        .from("promoters")
        .select("id, commission_rate")
        .in("id", promoterIds);

      if (promoters) {
        for (const p of promoters) {
          if (!promoterConfigs.has(p.id)) {
            promoterConfigs.set(p.id, {
              promoter_id: p.id,
              commission_rate: p.commission_rate,
              table_commission_rate: null,
            });
          }
        }
      }
    }

    // Calculate commissions for each booking
    const commissions: Array<{
      booking_id: string;
      spend_amount: number;
      spend_source: "actual" | "minimum";
      promoter_id: string | null;
      promoter_commission_rate: number | null;
      promoter_commission_amount: number;
      venue_commission_rate: number;
      venue_commission_amount: number;
    }> = [];

    let totalSpend = 0;
    let totalPromoterCommission = 0;
    let totalVenueCommission = 0;

    for (const booking of bookings) {
      // Skip locked bookings
      if (booking.closeout_locked) {
        continue;
      }

      // Determine spend amount: actual_spend ?? minimum_spend ?? 0
      const spendAmount = booking.actual_spend ?? booking.minimum_spend ?? 0;
      const spendSource = booking.actual_spend !== null ? "actual" : "minimum";

      // Calculate promoter commission
      let promoterCommissionRate: number | null = null;
      let promoterCommissionAmount = 0;

      if (booking.promoter_id) {
        const config = promoterConfigs.get(booking.promoter_id);
        // Use table_commission_rate if available, otherwise use general commission_rate
        promoterCommissionRate = config?.table_commission_rate ?? config?.commission_rate ?? null;

        if (promoterCommissionRate !== null && spendAmount > 0) {
          promoterCommissionAmount = Math.round((spendAmount * promoterCommissionRate) / 100 * 100) / 100;
        }
      }

      // Calculate venue commission
      const venueCommissionAmount = Math.round((spendAmount * venueCommissionRate) / 100 * 100) / 100;

      commissions.push({
        booking_id: booking.id,
        spend_amount: spendAmount,
        spend_source: spendSource as "actual" | "minimum",
        promoter_id: booking.promoter_id,
        promoter_commission_rate: promoterCommissionRate,
        promoter_commission_amount: promoterCommissionAmount,
        venue_commission_rate: venueCommissionRate,
        venue_commission_amount: venueCommissionAmount,
      });

      totalSpend += spendAmount;
      totalPromoterCommission += promoterCommissionAmount;
      totalVenueCommission += venueCommissionAmount;
    }

    // Upsert commission records
    let createdCount = 0;
    let updatedCount = 0;

    for (const commission of commissions) {
      // Check if record exists
      const { data: existing } = await serviceSupabase
        .from("table_booking_commissions")
        .select("id, locked")
        .eq("booking_id", commission.booking_id)
        .single();

      if (existing) {
        if (!existing.locked) {
          // Update existing record
          await serviceSupabase
            .from("table_booking_commissions")
            .update({
              spend_amount: commission.spend_amount,
              spend_source: commission.spend_source,
              promoter_commission_rate: commission.promoter_commission_rate,
              promoter_commission_amount: commission.promoter_commission_amount,
              venue_commission_rate: commission.venue_commission_rate,
              venue_commission_amount: commission.venue_commission_amount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          updatedCount++;
        }
      } else {
        // Create new record
        await serviceSupabase
          .from("table_booking_commissions")
          .insert({
            booking_id: commission.booking_id,
            event_id: eventId,
            spend_amount: commission.spend_amount,
            spend_source: commission.spend_source,
            promoter_id: commission.promoter_id,
            promoter_commission_rate: commission.promoter_commission_rate,
            promoter_commission_amount: commission.promoter_commission_amount,
            venue_commission_rate: commission.venue_commission_rate,
            venue_commission_amount: commission.venue_commission_amount,
          });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        bookings_processed: commissions.length,
        commissions_created: createdCount,
        commissions_updated: updatedCount,
        total_spend: Math.round(totalSpend * 100) / 100,
        total_promoter_commission: Math.round(totalPromoterCommission * 100) / 100,
        total_venue_commission: Math.round(totalVenueCommission * 100) / 100,
        venue_commission_rate: venueCommissionRate,
      },
      commissions,
    });
  } catch (error: any) {
    console.error("Error in closeout calculate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate commissions" },
      { status: 500 }
    );
  }
}
