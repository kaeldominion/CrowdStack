import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    if (!promoters || promoters.length === 0) {
      return NextResponse.json({ promoters: [] });
    }

    // BATCH QUERY OPTIMIZATION: Fetch all data in bulk instead of N+1 queries

    // 1. Get all event_promoter assignments for these promoters and events
    const { data: allPromoterEvents } = await serviceSupabase
      .from("event_promoters")
      .select("promoter_id, event_id, assigned_by")
      .in("promoter_id", promoterIds)
      .in("event_id", eventIds);

    // Build map of promoter -> their event assignments
    const eventsByPromoter = new Map<string, Array<{ event_id: string; assigned_by: string | null }>>();
    (allPromoterEvents || []).forEach((ep) => {
      if (!eventsByPromoter.has(ep.promoter_id)) {
        eventsByPromoter.set(ep.promoter_id, []);
      }
      eventsByPromoter.get(ep.promoter_id)!.push({ event_id: ep.event_id, assigned_by: ep.assigned_by });
    });

    // 2. Get all registrations with referral_promoter_id for these events and promoters
    const { data: allReferrals } = await serviceSupabase
      .from("registrations")
      .select("id, event_id, referral_promoter_id")
      .in("event_id", eventIds)
      .in("referral_promoter_id", promoterIds);

    // Build map of promoter -> their referral registrations
    const referralsByPromoter = new Map<string, Array<{ id: string; event_id: string }>>();
    const allReferralIds: string[] = [];
    (allReferrals || []).forEach((reg) => {
      if (reg.referral_promoter_id) {
        if (!referralsByPromoter.has(reg.referral_promoter_id)) {
          referralsByPromoter.set(reg.referral_promoter_id, []);
        }
        referralsByPromoter.get(reg.referral_promoter_id)!.push({ id: reg.id, event_id: reg.event_id });
        allReferralIds.push(reg.id);
      }
    });

    // 3. Get all checkins for these referral registrations
    const checkinsByRegistration = new Map<string, boolean>();
    if (allReferralIds.length > 0) {
      const { data: allCheckins } = await serviceSupabase
        .from("checkins")
        .select("registration_id")
        .in("registration_id", allReferralIds)
        .is("undo_at", null);

      (allCheckins || []).forEach((c) => {
        checkinsByRegistration.set(c.registration_id, true);
      });
    }

    // 4. Build final response using pre-fetched data
    const promotersWithStats = promoters.map((promoter) => {
      const promoterEvents = eventsByPromoter.get(promoter.id) || [];
      const promoterEventIds = promoterEvents.map((pe) => pe.event_id);

      // Check assignment types
      const hasDirectAssignment = promoterEvents.some(
        (ep) => ep.assigned_by === "organizer" || ep.assigned_by === null
      );
      const hasIndirectAssignment = promoterEvents.some(
        (ep) => ep.assigned_by === "venue"
      );

      // Get referrals for this promoter's assigned events
      const promoterReferrals = (referralsByPromoter.get(promoter.id) || [])
        .filter((ref) => promoterEventIds.includes(ref.event_id));

      const referralCount = promoterReferrals.length;

      // Count checkins from referrals
      const checkinsFromReferrals = promoterReferrals.filter(
        (ref) => checkinsByRegistration.has(ref.id)
      ).length;

      const conversionRate =
        referralCount > 0
          ? Math.round((checkinsFromReferrals / referralCount) * 100)
          : 0;

      return {
        ...promoter,
        events_count: promoterEventIds.length,
        referrals_count: referralCount,
        checkins_count: checkinsFromReferrals,
        conversion_rate: conversionRate,
        has_direct_assignment: hasDirectAssignment,
        has_indirect_assignment: hasIndirectAssignment,
      };
    });

    return NextResponse.json({ promoters: promotersWithStats });
  } catch (error: any) {
    console.error("Error fetching organizer promoters:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoters" },
      { status: 500 }
    );
  }
}


