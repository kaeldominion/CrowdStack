import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { generateAndUploadPayoutStatement } from "@crowdstack/shared/pdf/generate-statement";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";

/**
 * POST /api/events/[eventId]/closeout/finalize
 * Finalize event closeout: lock check-ins, create payout run, generate statements, trigger emails
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

    const body = await request.json();
    const { total_revenue, closeout_notes } = body;

    const serviceSupabase = createServiceRoleClient();

    // Get event and verify access
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, name, currency, organizer_id, venue_id, status")
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if already closed
    if (event.status === "closed") {
      return NextResponse.json(
        { error: "Event is already closed" },
        { status: 400 }
      );
    }

    // Verify access (organizer or venue admin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let hasAccess = isSuperadmin;

    if (!hasAccess) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (organizer && event.organizer_id === organizer.id) {
        hasAccess = true;
      }

      if (!hasAccess && event.venue_id) {
        const { data: venue } = await serviceSupabase
          .from("venues")
          .select("id, created_by")
          .eq("id", event.venue_id)
          .single();

        if (venue && venue.created_by === userId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all event promoters with enhanced contract fields
    const { data: eventPromoters, error: promotersError } = await serviceSupabase
      .from("event_promoters")
      .select(`
        id,
        promoter_id,
        per_head_rate,
        per_head_min,
        per_head_max,
        bonus_threshold,
        bonus_amount,
        fixed_fee,
        manual_adjustment_amount,
        manual_adjustment_reason
      `)
      .eq("event_id", params.eventId);

    if (promotersError) {
      throw promotersError;
    }

    // Allow closing events with no promoters - just skip payout calculations
    const hasPromoters = eventPromoters && eventPromoters.length > 0;

    // Get all check-ins for this event
    const { data: checkins, error: checkinsError } = await serviceSupabase
      .from("checkins")
      .select(`
        registration_id,
        registrations!inner(
          event_id,
          referral_promoter_id
        )
      `)
      .eq("registrations.event_id", params.eventId)
      .is("undo_at", null);

    if (checkinsError) {
      throw checkinsError;
    }

    // Count check-ins per promoter
    const promoterCheckins: Record<string, number> = {};
    checkins?.forEach((checkin: any) => {
      const promoterId = checkin.registrations?.referral_promoter_id;
      if (promoterId) {
        promoterCheckins[promoterId] = (promoterCheckins[promoterId] || 0) + 1;
      }
    });

    // Create payout run (even if no promoters - for audit trail)
    const { data: payoutRun, error: payoutRunError } = await serviceSupabase
      .from("payout_runs")
      .insert({
        event_id: params.eventId,
        generated_by: userId,
      })
      .select()
      .single();

    if (payoutRunError) {
      throw payoutRunError;
    }

    // Calculate and create payout lines (only if there are promoters)
    const payoutLines = [];
    if (hasPromoters) {
      for (const ep of eventPromoters) {
      const checkinsCount = promoterCheckins[ep.promoter_id] || 0;

      // Calculate base payout
      let calculatedPayout = 0;

      // Per-head calculation
      if (ep.per_head_rate !== null && ep.per_head_rate !== undefined) {
        let countedCheckins = checkinsCount;

        // Apply min/max constraints
        if (ep.per_head_min !== null && countedCheckins < ep.per_head_min) {
          countedCheckins = 0;
        } else if (ep.per_head_max !== null && countedCheckins > ep.per_head_max) {
          countedCheckins = ep.per_head_max;
        }

        calculatedPayout += countedCheckins * (ep.per_head_rate || 0);
      }

      // Bonus calculation
      if (
        ep.bonus_threshold !== null &&
        ep.bonus_amount !== null &&
        checkinsCount >= ep.bonus_threshold
      ) {
        calculatedPayout += ep.bonus_amount;
      }

      // Fixed fee
      if (ep.fixed_fee !== null && ep.fixed_fee !== undefined) {
        calculatedPayout += ep.fixed_fee;
      }

      // Manual adjustment
      const manualAdjustment = ep.manual_adjustment_amount || 0;
      const finalPayout = calculatedPayout + manualAdjustment;

      const { data: payoutLine, error: lineError } = await serviceSupabase
        .from("payout_lines")
        .insert({
          payout_run_id: payoutRun.id,
          promoter_id: ep.promoter_id,
          checkins_count: checkinsCount,
          commission_amount: finalPayout,
          payment_status: "pending_payment",
        })
        .select()
        .single();

      if (lineError) {
        console.error(`[Closeout Finalize] Error creating payout line for promoter ${ep.promoter_id}:`, lineError);
        continue;
      }

      if (payoutLine) {
        payoutLines.push(payoutLine);
      }
    }

    // Only generate PDF and send emails if there are payout lines
    let pdfPath: string | null = null;
    let promoters: any[] = [];

    if (payoutLines.length > 0) {
      // Get promoter details for PDF
      const promoterIds = payoutLines.map((pl) => pl.promoter_id);
      const { data: promoterData } = await serviceSupabase
        .from("promoters")
        .select("*")
        .in("id", promoterIds);

      promoters = promoterData || [];

      const payoutLinesWithPromoters = payoutLines.map((pl) => ({
        ...pl,
        promoter: promoters.find((p) => p.id === pl.promoter_id),
      }));

      // Generate PDF and upload
      try {
        pdfPath = await generateAndUploadPayoutStatement(
          payoutRun,
          payoutLinesWithPromoters as any,
          event as any
        );

        // Update payout run with PDF path
        await serviceSupabase
          .from("payout_runs")
          .update({ statement_pdf_path: pdfPath })
          .eq("id", payoutRun.id);
      } catch (pdfError) {
        console.error("[Closeout Finalize] Error generating PDF:", pdfError);
        // Continue even if PDF generation fails
      }
    } else if (!hasPromoters) {
      // No promoters configured - that's fine, just log it
      console.log("[Closeout Finalize] Event closed with no promoters configured");
    }

    // Close the event
    const { error: closeError } = await serviceSupabase
      .from("events")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closeout_notes: closeout_notes || null,
        total_revenue: total_revenue || null,
        locked_at: new Date().toISOString(), // Also lock to prevent further changes
      })
      .eq("id", params.eventId);

    if (closeError) {
      throw closeError;
    }

    // Send payout ready emails to promoters (non-blocking, only if there are payout lines)
    if (payoutLines.length > 0) {
      try {
        const { sendPayoutReadyEmail } = await import("@crowdstack/shared/email/promoter-emails");
        
        for (const payoutLine of payoutLines) {
          const promoter = promoters.find((p) => p.id === payoutLine.promoter_id);
          if (promoter?.email) {
            const statementUrl = pdfPath
              ? `https://crowdstack.app/api/storage/statements/${pdfPath}`
              : undefined;

            await sendPayoutReadyEmail(
              promoter.id,
              promoter.name,
              promoter.email,
              promoter.created_by || null,
              event.name || "Event",
              payoutLine.commission_amount,
              event.currency || "IDR",
              statementUrl,
              params.eventId
            );
          }
        }
      } catch (emailError) {
        console.warn("[Closeout Finalize] Failed to send payout emails:", emailError);
      }
    }

    // Emit outbox event
    try {
      await emitOutboxEvent("event_closed", {
        event_id: params.eventId,
        payout_run_id: payoutRun.id,
        promoter_count: payoutLines.length,
      });
    } catch (outboxError) {
      console.warn("[Closeout Finalize] Failed to emit outbox event:", outboxError);
    }

    return NextResponse.json({
      success: true,
      payout_run: payoutRun,
      payout_lines: payoutLines,
      pdf_path: pdfPath,
      message: hasPromoters 
        ? "Event closed successfully. Payouts are now pending payment."
        : "Event closed successfully. No promoters were configured for this event.",
    });
  } catch (error: any) {
    console.error("[Closeout Finalize] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to finalize closeout" },
      { status: 500 }
    );
  }
}

