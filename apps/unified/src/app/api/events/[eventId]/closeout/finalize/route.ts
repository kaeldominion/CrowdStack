import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { generateAndUploadPayoutStatement } from "@crowdstack/shared/pdf/generate-statement";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { calculatePromoterPayout, type BonusTier } from "@crowdstack/shared/utils/payout-calculator";

/**
 * POST /api/events/[eventId]/closeout/finalize
 * Finalize event closeout: lock check-ins, create payout run, generate statements, trigger emails
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
      .select("id, name, currency, organizer_id, venue_id, status, closed_at")
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if already closed (using closed_at since we don't change status anymore)
    if (event.closed_at) {
      return NextResponse.json(
        { error: "Event is already closed" },
        { status: 400 }
      );
    }

    // Verify access (organizer or venue admin/team member)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let hasAccess = isSuperadmin;

    if (!hasAccess) {
      // Check if user is organizer creator
      const { data: organizerCreator } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("id", event.organizer_id)
        .eq("created_by", userId)
        .single();

      if (organizerCreator) {
        hasAccess = true;
      }

      // Check if user is organizer team member
      if (!hasAccess) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("id")
          .eq("organizer_id", event.organizer_id)
          .eq("user_id", userId)
          .single();

        if (organizerUser) {
          hasAccess = true;
        }
      }

      // Check if user is venue creator
      if (!hasAccess && event.venue_id) {
        const { data: venueCreator } = await serviceSupabase
          .from("venues")
          .select("id")
          .eq("id", event.venue_id)
          .eq("created_by", userId)
          .single();

        if (venueCreator) {
          hasAccess = true;
        }
      }

      // Check if user is venue team member
      if (!hasAccess && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("user_id", userId)
          .single();

        if (venueUser) {
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
        bonus_tiers,
        fixed_fee,
        minimum_guests,
        below_minimum_percent,
        manual_adjustment_amount,
        manual_adjustment_reason,
        manual_checkins_override,
        manual_checkins_reason
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
        const actualCheckinsCount = promoterCheckins[ep.promoter_id] || 0;

        // Use manual override if set, otherwise use actual count
        const effectiveCheckinsCount = ep.manual_checkins_override !== null
          ? ep.manual_checkins_override
          : actualCheckinsCount;

        // Parse bonus_tiers if it's a string (JSONB from DB)
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

        // Use shared calculation function for consistent payouts
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
            manual_adjustment_amount: ep.manual_adjustment_amount ? parseFloat(ep.manual_adjustment_amount) : null,
          },
          effectiveCheckinsCount
        );

        const { data: payoutLine, error: lineError } = await serviceSupabase
          .from("payout_lines")
          .insert({
            payout_run_id: payoutRun.id,
            promoter_id: ep.promoter_id,
            checkins_count: effectiveCheckinsCount,
            commission_amount: breakdown.final_payout,
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

    // Mark event as closed out (but keep status as "published" so it stays visible in history)
    // We set closed_at to indicate payouts are finalized, but don't change the public-facing status
    const { error: closeError } = await serviceSupabase
      .from("events")
      .update({
        // NOTE: We intentionally don't change status - events stay "published" for attendee history
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closeout_notes: closeout_notes || null,
        total_revenue: total_revenue || null,
        locked_at: new Date().toISOString(), // Lock to prevent further payout changes
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

