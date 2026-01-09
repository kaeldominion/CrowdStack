import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import {
  generateCloseoutReportPDF,
  type CloseoutReportData,
  type PromoterWithAttendees,
} from "@crowdstack/shared/pdf/generate-closeout-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // PDF generation can take time

/**
 * GET /api/events/[eventId]/closeout/export-pdf
 * Generate and download closeout report PDF
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

    const serviceSupabase = createServiceRoleClient();

    // Get event and verify access
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, name, currency, organizer_id, venue_id, start_date")
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check access (same logic as closeout route)
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

    // Get all event promoters with contract fields
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
        manual_adjustment_reason,
        manual_checkins_override,
        manual_checkins_reason,
        promoter:promoters(id, name)
      `)
      .eq("event_id", params.eventId);

    if (promotersError) {
      throw promotersError;
    }

    // Get all check-ins for this event
    const { data: checkins, error: checkinsError } = await serviceSupabase
      .from("checkins")
      .select(`
        id,
        checked_in_at,
        registration:registrations!inner(
          id,
          event_id,
          referral_promoter_id,
          attendee:attendees(
            id,
            name
          )
        )
      `)
      .eq("registration.event_id", params.eventId)
      .is("undo_at", null)
      .order("checked_in_at", { ascending: false });

    if (checkinsError) {
      throw checkinsError;
    }

    // Count check-ins per promoter and collect attendee data
    const promoterCheckins: Record<string, number> = {};
    const promoterAttendees: Record<string, Array<{ name: string; checked_in_at: string }>> = {};

    checkins?.forEach((checkin: any) => {
      const promoterId = checkin.registration?.referral_promoter_id;
      if (promoterId) {
        promoterCheckins[promoterId] = (promoterCheckins[promoterId] || 0) + 1;

        if (!promoterAttendees[promoterId]) {
          promoterAttendees[promoterId] = [];
        }

        const attendee = Array.isArray(checkin.registration?.attendee)
          ? checkin.registration.attendee[0]
          : checkin.registration?.attendee;

        promoterAttendees[promoterId].push({
          name: attendee?.name || "Unknown",
          checked_in_at: checkin.checked_in_at,
        });
      }
    });

    // Calculate payouts for each promoter
    const promotersWithData: PromoterWithAttendees[] = (eventPromoters || []).map((ep: any) => {
      const promoter = Array.isArray(ep.promoter) ? ep.promoter[0] : ep.promoter;
      const actualCheckinsCount = promoterCheckins[ep.promoter_id] || 0;

      // Use manual override if set, otherwise use actual count
      const effectiveCheckinsCount =
        ep.manual_checkins_override !== null
          ? ep.manual_checkins_override
          : actualCheckinsCount;

      // Calculate base payout
      let calculatedPayout = 0;

      // Per-head calculation
      if (ep.per_head_rate !== null && ep.per_head_rate !== undefined) {
        let countedCheckins = effectiveCheckinsCount;

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
        effectiveCheckinsCount >= ep.bonus_threshold
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

      return {
        promoter_id: ep.promoter_id,
        promoter_name: promoter?.name || "Unknown",
        checkins_count: effectiveCheckinsCount,
        actual_checkins_count: actualCheckinsCount,
        manual_checkins_override: ep.manual_checkins_override,
        manual_checkins_reason: ep.manual_checkins_reason,
        calculated_payout: calculatedPayout,
        manual_adjustment_amount: ep.manual_adjustment_amount,
        manual_adjustment_reason: ep.manual_adjustment_reason,
        final_payout: finalPayout,
        attendees: promoterAttendees[ep.promoter_id] || [],
      };
    });

    const totalCheckins = Object.values(promoterCheckins).reduce((a, b) => a + b, 0);
    const totalPayout = promotersWithData.reduce((sum, p) => sum + p.final_payout, 0);

    // Format event date if available
    const eventDate = event.start_date
      ? new Date(event.start_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    // Prepare report data
    const reportData: CloseoutReportData = {
      event_id: params.eventId,
      event_name: event.name || "Unknown Event",
      event_date: eventDate,
      currency: event.currency || "IDR",
      total_checkins: totalCheckins,
      total_payout: totalPayout,
      promoters: promotersWithData,
      generated_at: new Date(),
    };

    // Generate PDF
    const pdfBuffer = await generateCloseoutReportPDF(reportData);

    // Create safe filename
    const safeEventName = (event.name || "event")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `closeout-${safeEventName}-${dateStr}.pdf`;

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Closeout PDF Export] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
