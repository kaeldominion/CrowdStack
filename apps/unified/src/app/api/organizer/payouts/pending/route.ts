import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/organizer/payouts/pending
 * Get all pending payouts for organizer's events
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all organizer IDs the user has access to (creator or team member)
    const organizerIds = await getUserOrganizerIds();

    if (organizerIds.length === 0) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    // Step 1: Get all events for this organizer
    const { data: events, error: eventsError } = await serviceSupabase
      .from("events")
      .select("id")
      .in("organizer_id", organizerIds);

    if (eventsError) {
      throw eventsError;
    }

    const eventIds = events?.map(e => e.id) || [];

    if (eventIds.length === 0) {
      // No events = no payouts
      return NextResponse.json({
        events: [],
        totals_by_currency: {},
        total_payouts: 0,
      });
    }

    // Step 2: Get payout runs for those events
    const { data: payoutRuns, error: runsError } = await serviceSupabase
      .from("payout_runs")
      .select("id")
      .in("event_id", eventIds);

    if (runsError) {
      throw runsError;
    }

    const payoutRunIds = payoutRuns?.map(pr => pr.id) || [];

    console.log("[Pending Payouts API] organizerIds:", organizerIds);
    console.log("[Pending Payouts API] eventIds:", eventIds.length, "events");
    console.log("[Pending Payouts API] payoutRunIds:", payoutRunIds.length, "payout runs");

    if (payoutRunIds.length === 0) {
      // No payout runs = no payouts
      console.log("[Pending Payouts API] No payout runs found, returning empty");
      return NextResponse.json({
        events: [],
        totals_by_currency: {},
        total_payouts: 0,
      });
    }

    // Step 3: Get all payout lines for those payout runs with full details
    const { data: payoutLines, error: payoutError } = await serviceSupabase
      .from("payout_lines")
      .select(`
        id,
        payout_run_id,
        promoter_id,
        checkins_count,
        commission_amount,
        payment_status,
        payment_proof_path,
        payment_marked_by,
        payment_marked_at,
        payment_notes,
        created_at,
        payout_runs!inner(
          id,
          event_id,
          generated_at,
          events!inner(
            id,
            name,
            currency,
            start_time,
            closed_at
          )
        ),
        promoter:promoters(id, name, email)
      `)
      .in("payout_run_id", payoutRunIds)
      .order("created_at", { ascending: false });

    if (payoutError) {
      throw payoutError;
    }

    console.log("[Pending Payouts API] payoutLines:", payoutLines?.length || 0, "lines");

    // Group by event and filter by status
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") || "all";

    let filtered = payoutLines || [];
    if (statusFilter !== "all") {
      filtered = filtered.filter((pl: any) => pl.payment_status === statusFilter);
    }

    // Group by event
    const groupedByEvent: Record<string, any> = {};
    filtered.forEach((pl: any) => {
      const event = pl.payout_runs?.events;
      if (!event) return;

      const eventId = event.id;
      if (!groupedByEvent[eventId]) {
        groupedByEvent[eventId] = {
          event_id: eventId,
          event_name: event.name,
          event_date: event.start_time,
          currency: event.currency || "IDR",
          closed_at: event.closed_at,
          payouts: [],
          total_amount: 0,
        };
      }

      const promoter = Array.isArray(pl.promoter) ? pl.promoter[0] : pl.promoter;
      groupedByEvent[eventId].payouts.push({
        ...pl,
        promoter,
      });
      groupedByEvent[eventId].total_amount += Number(pl.commission_amount || 0);
    });

    // Calculate totals by currency
    const totalsByCurrency: Record<string, number> = {};
    Object.values(groupedByEvent).forEach((event: any) => {
      const currency = event.currency || "IDR";
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + event.total_amount;
    });

    return NextResponse.json({
      events: Object.values(groupedByEvent),
      totals_by_currency: totalsByCurrency,
      total_payouts: filtered.length,
    });
  } catch (error: any) {
    console.error("[Pending Payouts API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending payouts" },
      { status: 500 }
    );
  }
}

