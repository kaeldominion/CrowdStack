import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden - Organizer or Superadmin role required" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events for this organizer
    const { data: events } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("organizer_id", organizerId);

    const eventIds = events?.map((e) => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({ promoters: [] });
    }

    // Get all promoters assigned to events for this organizer
    const { data: eventPromoters, error: epError } = await serviceSupabase
      .from("event_promoters")
      .select("promoter_id, assigned_by")
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
      .select("id, name, email, phone, created_at")
      .in("id", promoterIds)
      .order("name", { ascending: true });

    if (promotersError) {
      throw promotersError;
    }

    // Get stats and assignment info for each promoter
    const promotersWithStats = await Promise.all(
      (promoters || []).map(async (promoter) => {
        // Get events this promoter is assigned to for this organizer
        const { data: promoterEvents } = await serviceSupabase
          .from("event_promoters")
          .select("event_id, assigned_by")
          .eq("promoter_id", promoter.id)
          .in("event_id", eventIds);

        const promoterEventIds =
          promoterEvents?.map((ep) => ep.event_id) || [];

        // Check if promoter was ever assigned directly by organizer vs through venue
        const hasDirectAssignment = promoterEvents?.some(
          (ep) => ep.assigned_by === "organizer" || ep.assigned_by === null
        );
        const hasIndirectAssignment = promoterEvents?.some(
          (ep) => ep.assigned_by === "venue"
        );

        // Count registrations through this promoter's referrals
        const { count: referralCount } = await serviceSupabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .in("event_id", promoterEventIds)
          .eq("referral_promoter_id", promoter.id);

        // Get registration IDs for referrals
        const { data: referrals } = await serviceSupabase
          .from("registrations")
          .select("id")
          .in("event_id", promoterEventIds)
          .eq("referral_promoter_id", promoter.id);

        const referralRegIds = referrals?.map((r) => r.id) || [];

        // Count check-ins from referrals
        let checkinsFromReferrals = 0;
        if (referralRegIds.length > 0) {
          const { count: checkinCount } = await serviceSupabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", referralRegIds)
            .is("undo_at", null);

          checkinsFromReferrals = checkinCount || 0;
        }

        const conversionRate =
          referralCount && referralCount > 0
            ? Math.round((checkinsFromReferrals / referralCount) * 100)
            : 0;

        return {
          ...promoter,
          events_count: promoterEventIds.length,
          referrals_count: referralCount || 0,
          checkins_count: checkinsFromReferrals,
          conversion_rate: conversionRate,
          has_direct_assignment: hasDirectAssignment || false,
          has_indirect_assignment: hasIndirectAssignment || false,
        };
      })
    );

    return NextResponse.json({ promoters: promotersWithStats });
  } catch (error: any) {
    console.error("Error fetching organizer promoters:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoters" },
      { status: 500 }
    );
  }
}


