import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import type { CloseoutSummary } from "@crowdstack/shared/types";

/**
 * GET /api/events/[eventId]/closeout
 * Get closeout summary with promoter stats and calculated payouts
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
      .select("id, name, currency, organizer_id, venue_id, status")
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user is organizer or venue admin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let hasAccess = isSuperadmin;

    if (!hasAccess) {
      // Check if user is organizer
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (organizer && event.organizer_id === organizer.id) {
        hasAccess = true;
      }

      // Check if user is venue admin
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
        manual_adjustment_reason,
        promoter:promoters(id, name, email)
      `)
      .eq("event_id", params.eventId);

    if (promotersError) {
      throw promotersError;
    }

    if (!eventPromoters || eventPromoters.length === 0) {
      return NextResponse.json({
        event_id: params.eventId,
        event_name: event.name,
        promoters: [],
        total_checkins: 0,
        total_payout: 0,
        currency: event.currency || "IDR",
      } as CloseoutSummary);
    }

    // Get all check-ins for this event with referral promoter
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

    // Calculate payouts for each promoter
    const promoters = eventPromoters.map((ep: any) => {
      const promoter = Array.isArray(ep.promoter) ? ep.promoter[0] : ep.promoter;
      const checkinsCount = promoterCheckins[ep.promoter_id] || 0;

      // Calculate base payout
      let calculatedPayout = 0;

      // Per-head calculation
      if (ep.per_head_rate !== null && ep.per_head_rate !== undefined) {
        let countedCheckins = checkinsCount;

        // Apply min/max constraints
        if (ep.per_head_min !== null && countedCheckins < ep.per_head_min) {
          countedCheckins = 0; // Below minimum, no per-head payment
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

      return {
        promoter_id: ep.promoter_id,
        promoter_name: promoter?.name || "Unknown",
        checkins_count: checkinsCount,
        calculated_payout: calculatedPayout,
        manual_adjustment_amount: ep.manual_adjustment_amount,
        manual_adjustment_reason: ep.manual_adjustment_reason,
        final_payout: finalPayout,
      };
    });

    const totalCheckins = Object.values(promoterCheckins).reduce((a, b) => a + b, 0);
    const totalPayout = promoters.reduce((sum, p) => sum + p.final_payout, 0);

    const summary: CloseoutSummary = {
      event_id: params.eventId,
      event_name: event.name || "Unknown Event",
      promoters,
      total_checkins: totalCheckins,
      total_payout: totalPayout,
      currency: event.currency || "IDR",
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[Closeout API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get closeout summary" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[eventId]/closeout
 * Update manual adjustments for promoter payouts
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { promoter_id, manual_adjustment_amount, manual_adjustment_reason } = body;

    if (!promoter_id) {
      return NextResponse.json(
        { error: "promoter_id is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event access (same logic as GET)
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, venue_id, status")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check access (organizer or venue admin)
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

    // Check if event is already closed
    if (event.status === "closed") {
      return NextResponse.json(
        { error: "Event is already closed. Cannot modify adjustments." },
        { status: 400 }
      );
    }

    // Update manual adjustment
    const { data: updated, error: updateError } = await serviceSupabase
      .from("event_promoters")
      .update({
        manual_adjustment_amount: manual_adjustment_amount ?? null,
        manual_adjustment_reason: manual_adjustment_reason || null,
      })
      .eq("event_id", params.eventId)
      .eq("promoter_id", promoter_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, event_promoter: updated });
  } catch (error: any) {
    console.error("[Closeout API] Error updating adjustment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update adjustment" },
      { status: 500 }
    );
  }
}

