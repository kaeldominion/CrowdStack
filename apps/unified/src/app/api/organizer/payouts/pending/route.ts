import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

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

    // Get user's organizer ID
    const { data: organizer } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("created_by", userId)
      .single();

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    // Get all payout lines for events owned by this organizer
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
      .eq("payout_runs.events.organizer_id", organizer.id)
      .order("payout_runs.events.start_time", { ascending: false });

    if (payoutError) {
      throw payoutError;
    }

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

