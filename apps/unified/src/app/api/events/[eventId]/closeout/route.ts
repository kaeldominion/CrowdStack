import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import type { CloseoutSummary } from "@crowdstack/shared/types";
import { CACHE, getCacheControl } from "@/lib/cache";
import { calculatePromoterPayout, type BonusTier } from "@crowdstack/shared/utils/payout-calculator";

// Financial data - explicitly disable caching
export const dynamic = 'force-dynamic';

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
        manual_checkins_reason,
        promoter:promoters(id, name, email)
      `)
      .eq("event_id", params.eventId);

    if (promotersError) {
      throw promotersError;
    }

    if (!eventPromoters || eventPromoters.length === 0) {
      return NextResponse.json(
        {
          event_id: params.eventId,
          event_name: event.name,
          promoters: [],
          total_checkins: 0,
          total_payout: 0,
          currency: event.currency || "IDR",
        } as CloseoutSummary,
        {
          headers: {
            'Cache-Control': getCacheControl(CACHE.realtime),
          },
        }
      );
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

    // Calculate payouts for each promoter using shared calculation logic
    const promoters = eventPromoters.map((ep: any) => {
      const promoter = Array.isArray(ep.promoter) ? ep.promoter[0] : ep.promoter;
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

      // Use shared calculation function
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

      return {
        promoter_id: ep.promoter_id,
        promoter_name: promoter?.name || "Unknown",
        checkins_count: effectiveCheckinsCount,
        actual_checkins_count: actualCheckinsCount,
        manual_checkins_override: ep.manual_checkins_override,
        manual_checkins_reason: ep.manual_checkins_reason,
        calculated_payout: breakdown.calculated_payout,
        payout_breakdown: {
          per_head_amount: breakdown.per_head_amount,
          per_head_rate: breakdown.per_head_rate,
          per_head_counted: breakdown.per_head_counted,
          fixed_fee_amount: breakdown.fixed_fee_amount,
          fixed_fee_full: breakdown.fixed_fee_full,
          fixed_fee_percent_applied: breakdown.fixed_fee_percent_applied,
          bonus_amount: breakdown.bonus_amount,
          bonus_details: breakdown.bonus_details,
        },
        manual_adjustment_amount: ep.manual_adjustment_amount ? parseFloat(ep.manual_adjustment_amount) : null,
        manual_adjustment_reason: ep.manual_adjustment_reason,
        final_payout: breakdown.final_payout,
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

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': getCacheControl(CACHE.realtime),
      },
    });
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
    const {
      promoter_id,
      manual_adjustment_amount,
      manual_adjustment_reason,
      manual_checkins_override,
      manual_checkins_reason,
    } = body;

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

    // Check access (organizer or venue admin/team member)
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

    // Check if event is already closed
    if (event.status === "closed") {
      return NextResponse.json(
        { error: "Event is already closed. Cannot modify adjustments." },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};

    // Handle adjustment fields if provided
    if (manual_adjustment_amount !== undefined) {
      updateData.manual_adjustment_amount = manual_adjustment_amount ?? null;
    }
    if (manual_adjustment_reason !== undefined) {
      updateData.manual_adjustment_reason = manual_adjustment_reason || null;
    }

    // Handle checkins override fields if provided
    if (manual_checkins_override !== undefined) {
      updateData.manual_checkins_override = manual_checkins_override ?? null;
    }
    if (manual_checkins_reason !== undefined) {
      updateData.manual_checkins_reason = manual_checkins_reason || null;
    }

    // Update the event_promoter record
    const { data: updated, error: updateError } = await serviceSupabase
      .from("event_promoters")
      .update(updateData)
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

