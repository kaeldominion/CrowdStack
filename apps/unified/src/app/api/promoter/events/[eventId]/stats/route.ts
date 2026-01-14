import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserWithRetry } from "@crowdstack/shared/supabase/auth-helpers";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log("[Promoter Stats] Starting...");
    const cookieStore = await cookies();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await getUserWithRetry(supabase);

    // Handle network errors gracefully
    if (authError && authError.message?.includes("fetch failed")) {
      console.error("[Promoter Stats] Network error fetching user:", authError);
      return NextResponse.json(
        { error: "Network error. Please try again." },
        { status: 503 }
      );
    }

    console.log("[Promoter Stats] auth user:", user?.id, user?.email);

    // SECURITY: Only allow localhost fallback in non-production environments
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        console.warn("[Promoter Stats] Using localhost_user_id fallback - DEV ONLY");
        userId = localhostUser;
      }
    }
    console.log("[Promoter Stats] userId:", userId);

    if (!userId) {
      console.log("[Promoter Stats] No userId, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    console.log("[Promoter Stats] serviceClient created");

    // Get the promoter for this user - check both user_id and created_by
    let { data: promoter } = await serviceClient
      .from("promoters")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!promoter) {
      // Fallback: check created_by
      const { data: promoterByCreator } = await serviceClient
        .from("promoters")
        .select("id")
        .eq("created_by", userId)
        .single();
      
      promoter = promoterByCreator;
    }

    if (!promoter) {
      console.log("Promoter not found for user:", userId);
      // Return empty stats instead of 403 to allow the UI to handle gracefully
      return NextResponse.json({
        referrals: 0,
        checkins: 0,
        conversionRate: 0,
        leaderboard_position: 0,
        total_promoters: 0,
        event_total_registrations: 0,
        event_total_checkins: 0,
        total_registrations: 0,
        total_check_ins: 0,
        capacity: null,
        capacity_remaining: null,
        capacity_percentage: null,
        error: "Promoter profile not found",
      });
    }
    
    console.log("Found promoter:", promoter.id, "for user:", userId);

    // Get registrations referred by this promoter for this event (with checked_in status)
    const { data: registrations, error: regError } = await serviceClient
      .from("registrations")
      .select("id, attendee_id, referral_promoter_id, checked_in")
      .eq("event_id", params.eventId)
      .eq("referral_promoter_id", promoter.id);

    if (regError) {
      console.error("Error fetching registrations:", regError);
      return NextResponse.json(
        { error: "Failed to fetch stats", details: regError.message },
        { status: 500 }
      );
    }

    const referrals = registrations?.length || 0;

    // Count check-ins using the checked_in boolean field
    const checkins = registrations?.filter(r => r.checked_in).length || 0;
    console.log(`[Promoter Stats] Promoter ${promoter.id}: referrals=${referrals}, checkins=${checkins}`);

    const conversionRate = referrals > 0 ? (checkins / referrals) * 100 : 0;

    // Get overall event stats with checked_in status
    const { data: allRegistrations, error: allRegError } = await serviceClient
      .from("registrations")
      .select("id, referral_promoter_id, checked_in")
      .eq("event_id", params.eventId);

    if (allRegError) {
      console.error("Error fetching all registrations:", allRegError);
    }

    const event_total_registrations = allRegistrations?.length || 0;

    // Count check-ins using checked_in field
    const event_total_checkins = allRegistrations?.filter(r => r.checked_in).length || 0;

    // Build set of checked-in registration IDs for leaderboard calculation
    const checkedInRegIds = new Set<string>();
    allRegistrations?.forEach(r => {
      if (r.checked_in) {
        checkedInRegIds.add(r.id);
      }
    });

    // Calculate leaderboard position
    let leaderboard_position = 1;
    let total_promoters = 1;

    if (allRegistrations && allRegistrations.length > 0) {
      // Get all promoters for this event and their check-in counts
      const promoterCheckIns: Record<string, number> = {};
      
      for (const reg of allRegistrations as any[]) {
        const isCheckedIn = checkedInRegIds.has(reg.id);
        if (reg.referral_promoter_id && isCheckedIn) {
          promoterCheckIns[reg.referral_promoter_id] = (promoterCheckIns[reg.referral_promoter_id] || 0) + 1;
        }
      }

      // Also count promoters with 0 check-ins but assigned to this event
      const { data: eventPromoters } = await serviceClient
        .from("event_promoters")
        .select("promoter_id")
        .eq("event_id", params.eventId);

      if (eventPromoters) {
        total_promoters = eventPromoters.length;
        
        // Add promoters with 0 check-ins
        for (const ep of eventPromoters) {
          if (!(ep.promoter_id in promoterCheckIns)) {
            promoterCheckIns[ep.promoter_id] = 0;
          }
        }
      }

      // Sort by check-ins descending
      const sortedPromoters = Object.entries(promoterCheckIns)
        .sort(([, a], [, b]) => b - a);

      // Find this promoter's position
      leaderboard_position = sortedPromoters.findIndex(([id]) => id === promoter.id) + 1;
      
      // If promoter not in list (no registrations), they're last
      if (leaderboard_position === 0) {
        leaderboard_position = total_promoters;
      }
    }

    // Get event guestlist capacity (don't fail if this errors)
    let capacity: number | null = null;
    try {
      const { data: eventData } = await serviceClient
        .from("events")
        .select("max_guestlist_size")
        .eq("id", params.eventId)
        .single();
      capacity = eventData?.max_guestlist_size || null;
    } catch (e) {
      console.error("Error fetching event capacity:", e);
    }

    const statsResponse = {
      // Promoter-specific fields
      referrals,
      checkins,
      conversionRate,
      leaderboard_position,
      total_promoters,
      event_total_registrations,
      event_total_checkins,
      // Also include organizer-style fields for compatibility
      total_registrations: event_total_registrations,
      total_check_ins: event_total_checkins,
      capacity,
      capacity_remaining: capacity ? capacity - event_total_registrations : null,
      capacity_percentage: capacity ? Math.round((event_total_registrations / capacity) * 100) : null,
    };
    
    console.log("Promoter stats response:", statsResponse);
    return NextResponse.json(statsResponse);
  } catch (error: any) {
    console.error("Error fetching promoter stats:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

