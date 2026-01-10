import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";
import { calculatePromoterPayout, type BonusTier } from "@crowdstack/shared/utils/payout-calculator";

export interface PromoterEventEarnings {
  event_id: string;
  event_name: string;
  event_date: string;
  event_status: "active" | "closed";
  currency: string;
  checkins_count: number;
  registrations_count: number;
  commission_amount: number;
  payment_status: "estimated" | "pending_payment" | "paid" | "confirmed";
  payment_proof_url: string | null;
  paid_at: string | null;
  payout_line_id: string | null;
}

export interface PromoterEarningsSummary {
  confirmed: number;
  pending: number;
  estimated: number;
  total: number;
  by_currency: Record<string, {
    confirmed: number;
    pending: number;
    estimated: number;
    total: number;
  }>;
}

/**
 * GET /api/promoter/earnings
 * Get detailed earnings breakdown for the current promoter
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events this promoter is assigned to with full contract fields
    // Include venue for currency fallback
    const { data: eventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select(`
        event_id,
        commission_type,
        commission_config,
        per_head_rate,
        per_head_min,
        per_head_max,
        fixed_fee,
        minimum_guests,
        below_minimum_percent,
        bonus_threshold,
        bonus_amount,
        bonus_tiers,
        currency,
        events(
          id,
          name,
          slug,
          start_time,
          status,
          closed_at,
          currency,
          venue:venues(currency)
        )
      `)
      .eq("promoter_id", promoterId)
      .order("created_at", { ascending: false });

    if (!eventPromoters) {
      return NextResponse.json({
        events: [],
        summary: { confirmed: 0, pending: 0, estimated: 0, total: 0, by_currency: {} },
      });
    }

    // Get all payout lines for this promoter
    const { data: payoutLines } = await serviceSupabase
      .from("payout_lines")
      .select(`
        id,
        checkins_count,
        commission_amount,
        payment_status,
        payment_proof_path,
        payment_marked_at,
        payout_runs(
          event_id
        )
      `)
      .eq("promoter_id", promoterId);

    // Create a map of event_id -> payout_line
    const payoutByEvent: Record<string, any> = {};
    if (payoutLines) {
      for (const line of payoutLines) {
        const eventId = (line.payout_runs as any)?.event_id;
        if (eventId) {
          payoutByEvent[eventId] = line;
        }
      }
    }

    const earnings: PromoterEventEarnings[] = [];
    const summary: PromoterEarningsSummary = {
      confirmed: 0,
      pending: 0,
      estimated: 0,
      total: 0,
      by_currency: {},
    };

    for (const ep of eventPromoters) {
      const event = Array.isArray(ep.events) ? ep.events[0] : ep.events;
      if (!event) continue;

      // Get venue from event (handle Supabase nested relation types)
      const venue = (event as any).venue;
      const venueCurrency = Array.isArray(venue) ? venue[0]?.currency : venue?.currency;

      // Currency fallback: event_promoters > event > venue > IDR (default for Bali)
      const currency = ep.currency || event.currency || venueCurrency || "IDR";
      const payoutLine = payoutByEvent[event.id];

      // Initialize currency in summary if needed
      if (!summary.by_currency[currency]) {
        summary.by_currency[currency] = { confirmed: 0, pending: 0, estimated: 0, total: 0 };
      }

      if (payoutLine) {
        // Event has been closed out - use payout line data
        const amount = parseFloat(payoutLine.commission_amount || "0");
        const paymentStatus = payoutLine.payment_status || "pending_payment";

        let proofUrl = null;
        if (payoutLine.payment_proof_path) {
          const { data: urlData } = serviceSupabase.storage
            .from("payouts")
            .getPublicUrl(payoutLine.payment_proof_path);
          proofUrl = urlData?.publicUrl || null;
        }

        earnings.push({
          event_id: event.id,
          event_name: event.name,
          event_date: event.start_time,
          event_status: "closed",
          currency,
          checkins_count: payoutLine.checkins_count || 0,
          registrations_count: 0, // Could fetch if needed
          commission_amount: amount,
          payment_status: paymentStatus,
          payment_proof_url: proofUrl,
          paid_at: payoutLine.payment_marked_at,
          payout_line_id: payoutLine.id,
        });

        // Add to summary
        if (paymentStatus === "paid" || paymentStatus === "confirmed") {
          summary.confirmed += amount;
          summary.by_currency[currency].confirmed += amount;
        } else {
          summary.pending += amount;
          summary.by_currency[currency].pending += amount;
        }
      } else if (!event.closed_at) {
        // Active event - calculate estimated earnings
        const { data: eventRegs } = await serviceSupabase
          .from("registrations")
          .select("id")
          .eq("event_id", event.id)
          .eq("referral_promoter_id", promoterId);

        const registrationsCount = eventRegs?.length || 0;
        let checkinsCount = 0;

        if (eventRegs && eventRegs.length > 0) {
          const regIds = eventRegs.map((r) => r.id);
          const { count } = await serviceSupabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", regIds)
            .is("undo_at", null);
          checkinsCount = count || 0;
        }

        // Parse bonus_tiers if present
        let bonusTiers: BonusTier[] | null = null;
        if (ep.bonus_tiers) {
          try {
            bonusTiers = typeof ep.bonus_tiers === 'string'
              ? JSON.parse(ep.bonus_tiers)
              : ep.bonus_tiers;
          } catch {
            bonusTiers = null;
          }
        }

        // Calculate estimated commission using shared calculation function
        const breakdown = calculatePromoterPayout(
          {
            per_head_rate: ep.per_head_rate ? parseFloat(ep.per_head_rate) : null,
            per_head_min: ep.per_head_min,
            per_head_max: ep.per_head_max,
            fixed_fee: ep.fixed_fee ? parseFloat(ep.fixed_fee) : null,
            minimum_guests: ep.minimum_guests,
            below_minimum_percent: ep.below_minimum_percent ? parseFloat(ep.below_minimum_percent) : null,
            bonus_threshold: ep.bonus_threshold,
            bonus_amount: ep.bonus_amount ? parseFloat(ep.bonus_amount) : null,
            bonus_tiers: bonusTiers,
            manual_adjustment_amount: null, // No manual adjustments for estimates
          },
          checkinsCount
        );

        const estimatedAmount = breakdown.calculated_payout;

        earnings.push({
          event_id: event.id,
          event_name: event.name,
          event_date: event.start_time,
          event_status: "active",
          currency,
          checkins_count: checkinsCount,
          registrations_count: registrationsCount,
          commission_amount: estimatedAmount,
          payment_status: "estimated",
          payment_proof_url: null,
          paid_at: null,
          payout_line_id: null,
        });

        summary.estimated += estimatedAmount;
        summary.by_currency[currency].estimated += estimatedAmount;
      }
    }

    // Calculate totals
    summary.total = summary.confirmed + summary.pending + summary.estimated;
    for (const currency of Object.keys(summary.by_currency)) {
      const c = summary.by_currency[currency];
      c.total = c.confirmed + c.pending + c.estimated;
    }

    // Sort by date (most recent first)
    earnings.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

    return NextResponse.json({
      events: earnings,
      summary,
    });
  } catch (error: any) {
    console.error("[Promoter Earnings] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}

