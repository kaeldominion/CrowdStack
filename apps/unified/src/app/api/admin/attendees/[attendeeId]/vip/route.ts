import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/attendees/[attendeeId]/vip
 * Fetch VIP status for an attendee
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
  try {
    const { attendeeId } = params;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check superadmin role
    const { data: roles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r) => r.role === "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch global VIP status from attendees
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("is_global_vip, global_vip_reason, global_vip_granted_at")
      .eq("id", attendeeId)
      .single();

    // Fetch venue VIPs
    const { data: venueVips } = await serviceSupabase
      .from("venue_vips")
      .select("id, venue_id, reason, created_at, venue:venues(id, name)")
      .eq("attendee_id", attendeeId);

    // Fetch organizer VIPs
    const { data: organizerVips } = await serviceSupabase
      .from("organizer_vips")
      .select("id, organizer_id, reason, created_at, organizer:organizers(id, name)")
      .eq("attendee_id", attendeeId);

    // Fetch all venues and organizers for selection
    const { data: allVenues } = await serviceSupabase
      .from("venues")
      .select("id, name")
      .order("name");

    const { data: allOrganizers } = await serviceSupabase
      .from("organizers")
      .select("id, name")
      .order("name");

    return NextResponse.json({
      globalVip: {
        isVip: attendee?.is_global_vip || false,
        reason: attendee?.global_vip_reason || null,
        grantedAt: attendee?.global_vip_granted_at || null,
      },
      venueVips: (venueVips || []).map((v: any) => ({
        id: v.id,
        venueId: v.venue_id,
        venueName: Array.isArray(v.venue) ? v.venue[0]?.name : v.venue?.name,
        reason: v.reason,
        createdAt: v.created_at,
      })),
      organizerVips: (organizerVips || []).map((o: any) => ({
        id: o.id,
        organizerId: o.organizer_id,
        organizerName: Array.isArray(o.organizer) ? o.organizer[0]?.name : o.organizer?.name,
        reason: o.reason,
        createdAt: o.created_at,
      })),
      availableVenues: allVenues || [],
      availableOrganizers: allOrganizers || [],
    });
  } catch (error: any) {
    console.error("[Admin VIP API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch VIP status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/attendees/[attendeeId]/vip
 * Update VIP status for an attendee
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
  try {
    const { attendeeId } = params;
    const body = await request.json();
    const { action, type, entityId, reason } = body;

    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check superadmin role
    const { data: roles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r) => r.role === "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle different VIP types
    if (type === "global") {
      if (action === "add") {
        await serviceSupabase
          .from("attendees")
          .update({
            is_global_vip: true,
            global_vip_reason: reason || "Manually set by admin",
            global_vip_granted_at: new Date().toISOString(),
          })
          .eq("id", attendeeId);
      } else if (action === "remove") {
        await serviceSupabase
          .from("attendees")
          .update({
            is_global_vip: false,
            global_vip_reason: null,
            global_vip_granted_at: null,
          })
          .eq("id", attendeeId);
      }
    } else if (type === "venue") {
      if (action === "add" && entityId) {
        // Check if already exists
        const { data: existing } = await serviceSupabase
          .from("venue_vips")
          .select("id")
          .eq("venue_id", entityId)
          .eq("attendee_id", attendeeId)
          .maybeSingle();

        if (!existing) {
          await serviceSupabase
            .from("venue_vips")
            .insert({
              venue_id: entityId,
              attendee_id: attendeeId,
              reason: reason || "Manually set by admin",
            });
        }
      } else if (action === "remove" && entityId) {
        await serviceSupabase
          .from("venue_vips")
          .delete()
          .eq("venue_id", entityId)
          .eq("attendee_id", attendeeId);
      }
    } else if (type === "organizer") {
      if (action === "add" && entityId) {
        // Check if already exists
        const { data: existing } = await serviceSupabase
          .from("organizer_vips")
          .select("id")
          .eq("organizer_id", entityId)
          .eq("attendee_id", attendeeId)
          .maybeSingle();

        if (!existing) {
          await serviceSupabase
            .from("organizer_vips")
            .insert({
              organizer_id: entityId,
              attendee_id: attendeeId,
              reason: reason || "Manually set by admin",
            });
        }
      } else if (action === "remove" && entityId) {
        await serviceSupabase
          .from("organizer_vips")
          .delete()
          .eq("organizer_id", entityId)
          .eq("attendee_id", attendeeId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin VIP API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update VIP status" },
      { status: 500 }
    );
  }
}
