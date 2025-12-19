import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";
import { 
  notifyOrganizerOfApproval,
  getVenueUserIds,
  sendNotifications,
  NotificationData
} from "@crowdstack/shared/notifications/send";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId = user?.id;

  // If no user from Supabase client, try reading from localhost cookie
  if (!userId) {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
    const authCookieName = `sb-${projectRef}-auth-token`;
    const authCookie = cookieStore.get(authCookieName);

    if (authCookie) {
      try {
        const cookieValue = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(cookieValue);
        if (parsed.user?.id) {
          userId = parsed.user.id;
        }
      } catch (e) {
        // Cookie parse error
      }
    }
  }

  return userId || null;
}

async function isSuperadmin(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .single();
  return !!data;
}

/**
 * POST /api/admin/events/[eventId]/approve
 * Admin approves or rejects an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, rejection_reason } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get event with organizer and venue details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        venue:venues!events_venue_id_fkey(id, name),
        organizer:organizers!events_organizer_id_fkey(id, name, created_by)
      `)
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const approved = action === "approve";
    const now = new Date().toISOString();

    // Update event approval status
    const { error: updateError } = await supabase
      .from("events")
      .update({
        venue_approval_status: approved ? "approved" : "rejected",
        venue_approval_at: now,
        venue_approval_by: userId,
        venue_rejection_reason: approved ? null : (rejection_reason || null),
      })
      .eq("id", params.eventId);

    if (updateError) {
      console.error("Error updating event:", updateError);
      return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
      );
    }

    // Notify organizer
    if (event.organizer) {
      await notifyOrganizerOfApproval(
        event.organizer.id,
        event.id,
        event.name,
        event.venue?.name || "the venue",
        approved,
        rejection_reason
      );
    }

    // Notify venue admins that admin approved this event
    if (event.venue_id) {
      const venueUserIds = await getVenueUserIds(event.venue_id);
      
      const venueNotifications: NotificationData[] = venueUserIds.map((venueUserId) => ({
        user_id: venueUserId,
        type: approved ? "admin_event_approved" : "admin_event_rejected",
        title: approved ? "Event Approved by Admin" : "Event Rejected by Admin",
        message: approved
          ? `"${event.name}" by ${event.organizer?.name || "an organizer"} has been approved by an administrator.`
          : `"${event.name}" by ${event.organizer?.name || "an organizer"} has been rejected by an administrator.${rejection_reason ? ` Reason: ${rejection_reason}` : ""}`,
        link: `/app/venue/events/${event.id}`,
        metadata: { event_id: event.id, approved_by_admin: true },
      }));

      await sendNotifications(venueNotifications);
    }

    return NextResponse.json({
      success: true,
      message: approved ? "Event approved successfully" : "Event rejected",
      event_id: params.eventId,
    });
  } catch (error) {
    console.error("Error approving event:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
