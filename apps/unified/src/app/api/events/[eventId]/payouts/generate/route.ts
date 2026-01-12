import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { generateAndUploadPayoutStatement } from "@crowdstack/shared/pdf/generate-statement";
import { trackPayoutGenerated } from "@/lib/analytics/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role
    if (!(await userHasRole("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get event and verify organizer
    const { data: event } = await serviceSupabase
      .from("events")
      .select("*, organizer_id")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: organizer } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (!organizer || event.organizer_id !== organizer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all checkins for this event
    const { data: checkins } = await serviceSupabase
      .from("checkins")
      .select(`
        registration_id,
        registrations!inner(
          event_id,
          referral_promoter_id,
          event_promoters(*)
        )
      `)
      .eq("registrations.event_id", params.eventId)
      .is("undo_at", null);

    // Get event promoters with commission configs
    const { data: eventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select("*")
      .eq("event_id", params.eventId);

    if (!eventPromoters) {
      return NextResponse.json(
        { error: "No promoters configured for this event" },
        { status: 400 }
      );
    }

    // Calculate commissions per promoter
    const promoterCheckins: Record<string, number> = {};
    checkins?.forEach((checkin: any) => {
      const promoterId = checkin.registrations?.referral_promoter_id;
      if (promoterId) {
        promoterCheckins[promoterId] = (promoterCheckins[promoterId] || 0) + 1;
      }
    });

    // Create payout run
    const { data: payoutRun, error: payoutRunError } = await serviceSupabase
      .from("payout_runs")
      .insert({
        event_id: params.eventId,
        generated_by: user.id,
      })
      .select()
      .single();

    if (payoutRunError) {
      throw payoutRunError;
    }

    // Get table booking commissions for this event
    const { data: tableCommissions } = await serviceSupabase
      .from("table_booking_commissions")
      .select("promoter_id, promoter_commission_amount")
      .eq("event_id", params.eventId)
      .not("promoter_id", "is", null);

    // Aggregate table commissions by promoter
    const tableCommissionsByPromoter: Record<string, { amount: number; count: number }> = {};
    tableCommissions?.forEach((tc: any) => {
      if (tc.promoter_id) {
        if (!tableCommissionsByPromoter[tc.promoter_id]) {
          tableCommissionsByPromoter[tc.promoter_id] = { amount: 0, count: 0 };
        }
        tableCommissionsByPromoter[tc.promoter_id].amount += parseFloat(tc.promoter_commission_amount || "0");
        tableCommissionsByPromoter[tc.promoter_id].count += 1;
      }
    });

    // Calculate and create payout lines
    const payoutLines = [];
    for (const ep of eventPromoters) {
      const checkinsCount = promoterCheckins[ep.promoter_id] || 0;
      let commissionAmount = 0;

      // Calculate check-in based commission
      if (ep.commission_type === "flat_per_head") {
        const perHead = ep.commission_config.flat_per_head || 0;
        commissionAmount = checkinsCount * perHead;
      } else if (ep.commission_type === "tiered_thresholds") {
        const tiers = ep.commission_config.tiered_thresholds || [];
        for (const tier of tiers) {
          if (checkinsCount >= tier.threshold) {
            commissionAmount = tier.amount;
          }
        }
      }

      // Add table booking commission
      const tableCommission = tableCommissionsByPromoter[ep.promoter_id];
      const tableCommissionAmount = tableCommission?.amount || 0;
      const tablesCount = tableCommission?.count || 0;
      const totalCommissionAmount = commissionAmount + tableCommissionAmount;

      const { data: payoutLine } = await serviceSupabase
        .from("payout_lines")
        .insert({
          payout_run_id: payoutRun.id,
          promoter_id: ep.promoter_id,
          checkins_count: checkinsCount,
          commission_amount: totalCommissionAmount,
          table_commission_amount: tableCommissionAmount,
          tables_count: tablesCount,
        })
        .select()
        .single();

      if (payoutLine) {
        payoutLines.push(payoutLine);
      }
    }

    // Get promoter details for PDF
    const promoterIds = payoutLines.map((pl) => pl.promoter_id);
    const { data: promoters } = await serviceSupabase
      .from("promoters")
      .select("*")
      .in("id", promoterIds);

    const payoutLinesWithPromoters = payoutLines.map((pl) => ({
      ...pl,
      promoter: promoters?.find((p) => p.id === pl.promoter_id),
    }));

    // Generate PDF and upload
    const pdfPath = await generateAndUploadPayoutStatement(
      payoutRun,
      payoutLinesWithPromoters as any,
      event as any
    );

    // Update payout run with PDF path
    await serviceSupabase
      .from("payout_runs")
      .update({ statement_pdf_path: pdfPath })
      .eq("id", payoutRun.id);

    // Lock event
    await serviceSupabase
      .from("events")
      .update({ locked_at: new Date().toISOString() })
      .eq("id", params.eventId);

    // Emit outbox event
    await emitOutboxEvent("payout_generated", {
      payout_run_id: payoutRun.id,
      event_id: params.eventId,
    });

    // Track analytics event
    try {
      const totalAmount = payoutLines.reduce((sum, pl) => sum + (pl.commission_amount || 0), 0);
      await trackPayoutGenerated(
        params.eventId,
        event.name || "Unknown Event",
        payoutLines.length,
        totalAmount,
        request
      );
    } catch (analyticsError) {
      console.warn("[Payout Generate API] Failed to track analytics event:", analyticsError);
    }

    return NextResponse.json({
      payout_run: payoutRun,
      payout_lines: payoutLines,
      pdf_path: pdfPath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate payout" },
      { status: 500 }
    );
  }
}

