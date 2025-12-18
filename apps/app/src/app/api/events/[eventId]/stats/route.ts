import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get user roles to check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Check if user can access this event
    if (!isSuperadmin) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (!organizer) {
        return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
      }

      const { data: event } = await serviceSupabase
        .from("events")
        .select("organizer_id")
        .eq("id", params.eventId)
        .single();

      if (!event || event.organizer_id !== organizer.id) {
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

    // Get promoter stats
    const { data: promoterStats } = await serviceSupabase
      .from("event_promoters")
      .select(`
        promoter:promoters(id, name),
        registrations(
          id,
          checkins(id)
        )
      `)
      .eq("event_id", params.eventId);

    const promoterBreakdown = (promoterStats || []).map((ep: any) => {
      const regs = ep.registrations || [];
      const checkins = regs.flatMap((r: any) => r.checkins || []).filter((c: any) => !c.undo_at);
      return {
        promoter_id: ep.promoter?.id,
        promoter_name: ep.promoter?.name,
        registrations: regs.length,
        check_ins: checkins.length,
      };
    });

    // Get recent registrations (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { count: recentRegistrations } = await serviceSupabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", params.eventId)
      .gte("created_at", yesterday.toISOString());

    return NextResponse.json({
      stats: {
        total_registrations: registrationCount || 0,
        total_check_ins: checkinCount || 0,
        capacity: event?.capacity || null,
        capacity_remaining: event?.capacity ? (event.capacity - (checkinCount || 0)) : null,
        capacity_percentage: event?.capacity
          ? Math.round(((checkinCount || 0) / event.capacity) * 100)
          : null,
        recent_registrations_24h: recentRegistrations || 0,
        promoter_breakdown: promoterBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

