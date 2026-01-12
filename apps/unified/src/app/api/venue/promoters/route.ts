import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

// Force dynamic rendering since this route uses getUserId() which uses cookies()
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events at this venue
    const { data: venueEvents } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("venue_id", venueId);

    const eventIds = venueEvents?.map((e) => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({ promoters: [] });
    }

    // Get all promoters assigned to events at this venue
    const { data: eventPromoters, error: epError } = await serviceSupabase
      .from("event_promoters")
      .select("promoter_id")
      .in("event_id", eventIds);

    if (epError) {
      throw epError;
    }

    // Get unique promoter IDs
    const promoterIds = [
      ...new Set(eventPromoters?.map((ep) => ep.promoter_id) || []),
    ];

    if (promoterIds.length === 0) {
      return NextResponse.json({ promoters: [] });
    }

    // Get promoter details
    const { data: promoters, error: promotersError } = await serviceSupabase
      .from("promoters")
      .select("id, name, email, phone, slug, created_at")
      .in("id", promoterIds)
      .order("name", { ascending: true });

    if (promotersError) {
      throw promotersError;
    }

    // BATCH QUERY OPTIMIZATION: Fetch all data in bulk instead of per-promoter

    // Get all event_promoters assignments for these promoters at this venue
    const { data: allEventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select("promoter_id, event_id, assigned_by")
      .in("promoter_id", promoterIds)
      .in("event_id", eventIds);

    // Get all registrations referred by these promoters for these events
    const { data: allReferrals } = await serviceSupabase
      .from("registrations")
      .select("id, event_id, referral_promoter_id, checked_in")
      .in("event_id", eventIds)
      .in("referral_promoter_id", promoterIds);

    // Build lookup maps for O(1) access
    const eventsByPromoter = new Map<string, { event_id: string; assigned_by: string | null }[]>();
    (allEventPromoters || []).forEach((ep) => {
      const existing = eventsByPromoter.get(ep.promoter_id) || [];
      existing.push({ event_id: ep.event_id, assigned_by: ep.assigned_by });
      eventsByPromoter.set(ep.promoter_id, existing);
    });

    const referralsByPromoter = new Map<string, number>();
    const checkinsByPromoter = new Map<string, number>();
    (allReferrals || []).forEach((reg) => {
      if (reg.referral_promoter_id) {
        referralsByPromoter.set(
          reg.referral_promoter_id,
          (referralsByPromoter.get(reg.referral_promoter_id) || 0) + 1
        );
        if (reg.checked_in) {
          checkinsByPromoter.set(
            reg.referral_promoter_id,
            (checkinsByPromoter.get(reg.referral_promoter_id) || 0) + 1
          );
        }
      }
    });

    // Build promoter stats from pre-computed maps (no additional queries)
    const promotersWithStats = (promoters || []).map((promoter) => {
      const promoterEvents = eventsByPromoter.get(promoter.id) || [];
      const referralCount = referralsByPromoter.get(promoter.id) || 0;
      const checkinsFromReferrals = checkinsByPromoter.get(promoter.id) || 0;

      const conversionRate =
        referralCount > 0
          ? Math.round((checkinsFromReferrals / referralCount) * 100)
          : 0;

      const hasDirectAssignment = promoterEvents.some(
        (ep) => ep.assigned_by === "venue"
      );
      const hasIndirectAssignment = promoterEvents.some(
        (ep) => ep.assigned_by === "organizer" || ep.assigned_by === null
      );

      return {
        ...promoter,
        events_count: promoterEvents.length,
        referrals_count: referralCount,
        checkins_count: checkinsFromReferrals,
        conversion_rate: conversionRate,
        has_direct_assignment: hasDirectAssignment,
        has_indirect_assignment: hasIndirectAssignment,
      };
    });

    return NextResponse.json(
      { promoters: promotersWithStats },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching venue promoters:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoters" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}


