import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserIdAndVenue(): Promise<{ userId: string | null; venueId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userId = user?.id || null;

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

  if (!userId) return { userId: null, venueId: null };

  // Get the venue the user manages
  const serviceClient = createServiceRoleClient();
  
  // Check if user is venue owner or venue_user
  const { data: venue } = await serviceClient
    .from("venues")
    .select("id")
    .eq("created_by", userId)
    .single();

  if (venue) return { userId, venueId: venue.id };

  const { data: venueUser } = await serviceClient
    .from("venue_users")
    .select("venue_id")
    .eq("user_id", userId)
    .single();

  return { userId, venueId: venueUser?.venue_id || null };
}

async function canManageVenueDoorStaff(userId: string, venueId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check if superadmin
  const { data: superadminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .single();

  if (superadminRole) return true;

  // Check if venue owner
  const { data: venue } = await supabase
    .from("venues")
    .select("created_by")
    .eq("id", venueId)
    .single();

  if (venue?.created_by === userId) return true;

  // Check if venue user with admin permissions
  const { data: venueUser } = await supabase
    .from("venue_users")
    .select("permissions")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .single();

  if (venueUser?.permissions?.full_admin) return true;

  return false;
}

/**
 * GET /api/venue/door-staff
 * Get all permanent door staff for the venue
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, venueId } = await getUserIdAndVenue();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for venueId in query params (for superadmins)
    const { searchParams } = new URL(request.url);
    const queryVenueId = searchParams.get("venueId") || venueId;

    if (!queryVenueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    if (!(await canManageVenueDoorStaff(userId, queryVenueId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get venue door staff with user details
    const { data: doorStaff, error } = await supabase
      .from("venue_door_staff")
      .select("id, user_id, status, notes, assigned_at, assigned_by")
      .eq("venue_id", queryVenueId)
      .order("assigned_at", { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty list gracefully
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("venue_door_staff table not found - migration may not be applied yet");
        return NextResponse.json({ door_staff: [], venue_name: "Unknown Venue" });
      }
      console.error("Error fetching venue door staff:", error);
      return NextResponse.json({ error: "Failed to fetch door staff" }, { status: 500 });
    }

    // Get user details for each door staff
    const staffWithDetails = await Promise.all(
      (doorStaff || []).map(async (staff) => {
        // Get user email from auth
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const authUser = users.find((u) => u.id === staff.user_id);
        
        // Get attendee profile for name
        const { data: attendee } = await supabase
          .from("attendees")
          .select("name, avatar_url")
          .eq("user_id", staff.user_id)
          .single();

        return {
          ...staff,
          user_email: authUser?.email || "Unknown",
          user_name: attendee?.name || authUser?.email?.split("@")[0] || "Unknown User",
          avatar_url: attendee?.avatar_url,
        };
      })
    );

    // Get venue name
    const { data: venue } = await supabase
      .from("venues")
      .select("name")
      .eq("id", queryVenueId)
      .single();

    return NextResponse.json({
      door_staff: staffWithDetails,
      venue_name: venue?.name || "Unknown Venue",
    });
  } catch (error) {
    console.error("Error fetching venue door staff:", error);
    return NextResponse.json({ error: "Failed to fetch door staff" }, { status: 500 });
  }
}

/**
 * POST /api/venue/door-staff
 * Add a permanent door staff member to the venue
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, venueId } = await getUserIdAndVenue();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, notes, venueId: bodyVenueId } = body;
    const targetVenueId = bodyVenueId || venueId;

    if (!targetVenueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    if (!(await canManageVenueDoorStaff(userId, targetVenueId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find user by email
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. They must have an account first." },
        { status: 404 }
      );
    }

    // Add door staff assignment
    const { data: assignment, error } = await supabase
      .from("venue_door_staff")
      .insert({
        venue_id: targetVenueId,
        user_id: targetUser.id,
        assigned_by: userId,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "User is already a door staff member" }, { status: 400 });
      }
      console.error("Error adding venue door staff:", error);
      return NextResponse.json({ error: "Failed to add door staff" }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Error adding venue door staff:", error);
    return NextResponse.json({ error: "Failed to add door staff" }, { status: 500 });
  }
}

/**
 * DELETE /api/venue/door-staff
 * Remove or revoke a door staff member from the venue
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, venueId } = await getUserIdAndVenue();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staff_id");
    const queryVenueId = searchParams.get("venueId") || venueId;

    if (!staffId) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }

    if (!queryVenueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    if (!(await canManageVenueDoorStaff(userId, queryVenueId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Revoke door staff (soft delete)
    const { error } = await supabase
      .from("venue_door_staff")
      .update({ status: "revoked" })
      .eq("id", staffId)
      .eq("venue_id", queryVenueId);

    if (error) {
      console.error("Error revoking venue door staff:", error);
      return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Door staff access revoked" });
  } catch (error) {
    console.error("Error revoking venue door staff:", error);
    return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
  }
}

