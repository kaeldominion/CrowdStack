import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Get user roles to check permissions
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");
    const isOrganizer = roles.includes("event_organizer");
    const isVenueAdmin = roles.includes("venue_admin");

    // Verify user has organizer or venue admin role (or is superadmin)
    if (!isSuperadmin && !isOrganizer && !isVenueAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user can access this event
    if (!isSuperadmin) {
      const { data: event } = await serviceSupabase
        .from("events")
        .select("organizer_id, venue_id")
        .eq("id", params.eventId)
        .single();

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      let hasAccess = false;

      // Check if user is organizer (via junction table first, then created_by)
      if (roles.includes("event_organizer")) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", userId)
          .eq("organizer_id", event.organizer_id)
          .single();
        
        if (organizerUser) {
          hasAccess = true;
        } else {
          // Fallback to created_by
          const { data: organizer } = await serviceSupabase
            .from("organizers")
            .select("id")
            .eq("created_by", userId)
            .single();
          
          if (organizer && organizer.id === event.organizer_id) {
            hasAccess = true;
          }
        }
      }

      // Check if user is venue admin
      if (!hasAccess && roles.includes("venue_admin") && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId)
          .eq("venue_id", event.venue_id)
          .single();
        
        if (venueUser) {
          hasAccess = true;
        } else {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", userId)
            .single();
          
          if (venue && venue.id === event.venue_id) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get event for capacity
    const { data: event } = await serviceSupabase
      .from("events")
      .select("capacity")
      .eq("id", params.eventId)
      .single();

    // Get registration count
    const { count: registrationCount } = await serviceSupabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", params.eventId);

    // Get check-in count
    const { count: checkinCount } = await serviceSupabase
      .from("checkins")
      .select(`
        *,
        registrations!inner(event_id)
      `, { count: "exact", head: true })
      .eq("registrations.event_id", params.eventId)
      .is("undo_at", null);

    // Get promoter stats - BATCH QUERY OPTIMIZATION
    // Fetch all promoters, registrations, and checkins in bulk instead of N+1 queries
    const { data: eventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select(`
        promoter:promoters(id, name)
      `)
      .eq("event_id", params.eventId);

    // Extract valid promoter IDs
    const promoterIds = (eventPromoters || [])
      .map((ep: any) => ep.promoter?.id)
      .filter((id): id is string => !!id);

    // Batch fetch all registrations for this event by these promoters
    const { data: allPromoterRegs } = promoterIds.length > 0
      ? await serviceSupabase
          .from("registrations")
          .select("id, referral_promoter_id")
          .eq("event_id", params.eventId)
          .in("referral_promoter_id", promoterIds)
      : { data: [] };

    // Get all registration IDs to batch fetch checkins
    const allRegIds = (allPromoterRegs || []).map((r) => r.id);

    // Batch fetch all checkins for these registrations
    const { data: allPromoterCheckins } = allRegIds.length > 0
      ? await serviceSupabase
          .from("checkins")
          .select("registration_id")
          .in("registration_id", allRegIds)
          .is("undo_at", null)
      : { data: [] };

    // Build maps for O(1) lookups
    const regsByPromoter = new Map<string, number>();
    const checkinRegIds = new Set((allPromoterCheckins || []).map((c) => c.registration_id));
    const checkinsByPromoter = new Map<string, number>();

    (allPromoterRegs || []).forEach((reg) => {
      if (reg.referral_promoter_id) {
        regsByPromoter.set(
          reg.referral_promoter_id,
          (regsByPromoter.get(reg.referral_promoter_id) || 0) + 1
        );
        if (checkinRegIds.has(reg.id)) {
          checkinsByPromoter.set(
            reg.referral_promoter_id,
            (checkinsByPromoter.get(reg.referral_promoter_id) || 0) + 1
          );
        }
      }
    });

    // Build promoter breakdown from maps (no additional queries)
    const validPromoterBreakdown = (eventPromoters || [])
      .map((ep: any) => {
        const promoterId = ep.promoter?.id;
        if (!promoterId) return null;
        return {
          promoter_id: promoterId,
          promoter_name: ep.promoter?.name,
          registrations: regsByPromoter.get(promoterId) || 0,
          check_ins: checkinsByPromoter.get(promoterId) || 0,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Get recent registrations (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { count: recentRegistrations } = await serviceSupabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", params.eventId)
      .gte("registered_at", yesterday.toISOString());

    // Get registration chart data (grouped by day)
    const { data: registrations } = await serviceSupabase
      .from("registrations")
      .select("registered_at")
      .eq("event_id", params.eventId)
      .order("registered_at", { ascending: true });

    // Group registrations by date
    const registrationByDate: Record<string, number> = {};
    const checkinByDate: Record<string, number> = {};

    if (registrations) {
      registrations.forEach((reg) => {
        const date = new Date(reg.registered_at).toLocaleDateString();
        registrationByDate[date] = (registrationByDate[date] || 0) + 1;
      });
    }

    // Get check-ins for chart
    const { data: checkins } = await serviceSupabase
      .from("checkins")
      .select(`
        checked_in_at,
        registrations!inner(event_id)
      `)
      .eq("registrations.event_id", params.eventId)
      .is("undo_at", null);

    if (checkins) {
      checkins.forEach((checkin: any) => {
        const date = new Date(checkin.checked_in_at).toLocaleDateString();
        checkinByDate[date] = (checkinByDate[date] || 0) + 1;
      });
    }

    // Create chart data array
    const allDates = new Set([
      ...Object.keys(registrationByDate),
      ...Object.keys(checkinByDate),
    ]);
    
    const chartData = Array.from(allDates)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => ({
        date,
        registrations: registrationByDate[date] || 0,
        checkins: checkinByDate[date] || 0,
      }));

    return NextResponse.json({
      total_registrations: registrationCount || 0,
      total_check_ins: checkinCount || 0,
      capacity: event?.capacity || null,
      capacity_remaining: event?.capacity ? (event.capacity - (checkinCount || 0)) : null,
      capacity_percentage: event?.capacity
        ? Math.round(((checkinCount || 0) / event.capacity) * 100)
        : null,
      recent_registrations_24h: recentRegistrations || 0,
      promoter_breakdown: validPromoterBreakdown,
      chart_data: chartData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

