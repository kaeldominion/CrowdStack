import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userId = user?.id;

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
      } catch (e) {}
    }
  }

  return userId || null;
}

async function canManageEventDoorStaff(userId: string, eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check if superadmin
  const { data: superadminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .single();

  if (superadminRole) return true;

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("venue_id, organizer_id")
    .eq("id", eventId)
    .single();

  if (!event) return false;

  // Check if venue admin
  if (event.venue_id) {
    const { data: venue } = await supabase
      .from("venues")
      .select("created_by")
      .eq("id", event.venue_id)
      .single();

    if (venue?.created_by === userId) return true;

    const { data: venueUser } = await supabase
      .from("venue_users")
      .select("id")
      .eq("venue_id", event.venue_id)
      .eq("user_id", userId)
      .single();

    if (venueUser) return true;
  }

  // Check if organizer
  if (event.organizer_id) {
    const { data: organizer } = await supabase
      .from("organizers")
      .select("created_by")
      .eq("id", event.organizer_id)
      .single();

    if (organizer?.created_by === userId) return true;

    const { data: organizerUser } = await supabase
      .from("organizer_users")
      .select("id")
      .eq("organizer_id", event.organizer_id)
      .eq("user_id", userId)
      .single();

    if (organizerUser) return true;
  }

  return false;
}

/**
 * GET /api/events/[eventId]/door-staff
 * Get all door staff assigned to an event
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

    if (!(await canManageEventDoorStaff(userId, params.eventId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get door staff assignments with user details
    const { data: doorStaff, error } = await supabase
      .from("event_door_staff")
      .select(`
        id,
        user_id,
        status,
        notes,
        assigned_at,
        assigned_by
      `)
      .eq("event_id", params.eventId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching door staff:", error);
      return NextResponse.json({ error: "Failed to fetch door staff" }, { status: 500 });
    }

    // Get user details for each door staff
    const staffWithDetails = await Promise.all(
      (doorStaff || []).map(async (staff) => {
        const { data: userData } = await supabase
          .from("auth.users")
          .select("email, raw_user_meta_data")
          .eq("id", staff.user_id)
          .single();

        // Fallback: try to get from auth.users view
        let email = userData?.email;
        let name = userData?.raw_user_meta_data?.full_name || userData?.raw_user_meta_data?.name;

        if (!email) {
          // Try admin lookup
          const { data: { users } } = await supabase.auth.admin.listUsers({
            perPage: 1,
            page: 1,
          });
          // This won't work for filtering, so we'll use a different approach
        }

        return {
          ...staff,
          user_email: email || "Unknown",
          user_name: name || email || "Unknown User",
        };
      })
    );

    // Get pending invites
    const { data: invites } = await supabase
      .from("door_staff_invites")
      .select("id, token, email, expires_at, created_at")
      .eq("event_id", params.eventId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString());

    return NextResponse.json({
      door_staff: staffWithDetails,
      pending_invites: invites || [],
    });
  } catch (error) {
    console.error("Error fetching door staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch door staff" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/door-staff
 * Add a door staff member or create an invite
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

    if (!(await canManageEventDoorStaff(userId, params.eventId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, email, user_id, notes } = body;

    const supabase = createServiceRoleClient();

    // Verify event exists
    const { data: event } = await supabase
      .from("events")
      .select("id, name")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (action === "invite") {
      // Create an invite token
      const { data: invite, error } = await supabase
        .from("door_staff_invites")
        .insert({
          event_id: params.eventId,
          email: email || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating invite:", error);
        return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
      }

      // Generate invite URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/door/invite/${invite.token}`;

      return NextResponse.json({
        success: true,
        invite: {
          ...invite,
          invite_url: inviteUrl,
        },
      });
    } else if (action === "assign" && user_id) {
      // Directly assign a user
      const { data: assignment, error } = await supabase
        .from("event_door_staff")
        .insert({
          event_id: params.eventId,
          user_id: user_id,
          assigned_by: userId,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "User already assigned as door staff" }, { status: 400 });
        }
        console.error("Error assigning door staff:", error);
        return NextResponse.json({ error: "Failed to assign door staff" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        assignment,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error managing door staff:", error);
    return NextResponse.json(
      { error: "Failed to manage door staff" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/door-staff
 * Remove a door staff member or revoke an invite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await canManageEventDoorStaff(userId, params.eventId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staff_id");
    const inviteId = searchParams.get("invite_id");

    const supabase = createServiceRoleClient();

    if (staffId) {
      // Revoke door staff assignment (soft delete)
      const { error } = await supabase
        .from("event_door_staff")
        .update({ status: "revoked" })
        .eq("id", staffId)
        .eq("event_id", params.eventId);

      if (error) {
        console.error("Error revoking door staff:", error);
        return NextResponse.json({ error: "Failed to revoke door staff" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Door staff access revoked" });
    } else if (inviteId) {
      // Delete invite
      const { error } = await supabase
        .from("door_staff_invites")
        .delete()
        .eq("id", inviteId)
        .eq("event_id", params.eventId);

      if (error) {
        console.error("Error deleting invite:", error);
        return NextResponse.json({ error: "Failed to delete invite" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Invite deleted" });
    } else {
      return NextResponse.json({ error: "Missing staff_id or invite_id" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error managing door staff:", error);
    return NextResponse.json(
      { error: "Failed to manage door staff" },
      { status: 500 }
    );
  }
}

