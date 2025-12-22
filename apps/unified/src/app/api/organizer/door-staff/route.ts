import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserIdAndOrganizer(): Promise<{ userId: string | null; organizerId: string | null }> {
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

  if (!userId) return { userId: null, organizerId: null };

  // Get the organizer the user manages
  const serviceClient = createServiceRoleClient();
  
  // Check if user is organizer owner or organizer_user
  const { data: organizer } = await serviceClient
    .from("organizers")
    .select("id")
    .eq("created_by", userId)
    .single();

  if (organizer) return { userId, organizerId: organizer.id };

  const { data: organizerUser } = await serviceClient
    .from("organizer_users")
    .select("organizer_id")
    .eq("user_id", userId)
    .single();

  return { userId, organizerId: organizerUser?.organizer_id || null };
}

async function canManageOrganizerDoorStaff(userId: string, organizerId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check if superadmin
  const { data: superadminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .single();

  if (superadminRole) return true;

  // Check if organizer owner
  const { data: organizer } = await supabase
    .from("organizers")
    .select("created_by")
    .eq("id", organizerId)
    .single();

  if (organizer?.created_by === userId) return true;

  // Check if organizer user
  const { data: organizerUser } = await supabase
    .from("organizer_users")
    .select("id")
    .eq("organizer_id", organizerId)
    .eq("user_id", userId)
    .single();

  if (organizerUser) return true;

  return false;
}

/**
 * GET /api/organizer/door-staff
 * Get all permanent door staff for the organizer
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, organizerId } = await getUserIdAndOrganizer();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for organizerId in query params (for superadmins)
    const { searchParams } = new URL(request.url);
    const queryOrganizerId = searchParams.get("organizerId") || organizerId;

    if (!queryOrganizerId) {
      return NextResponse.json({ error: "No organizer found" }, { status: 404 });
    }

    if (!(await canManageOrganizerDoorStaff(userId, queryOrganizerId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get organizer door staff with user details
    const { data: doorStaff, error } = await supabase
      .from("organizer_door_staff")
      .select("id, user_id, status, notes, assigned_at, assigned_by")
      .eq("organizer_id", queryOrganizerId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizer door staff:", error);
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

    // Get organizer name
    const { data: organizer } = await supabase
      .from("organizers")
      .select("name")
      .eq("id", queryOrganizerId)
      .single();

    return NextResponse.json({
      door_staff: staffWithDetails,
      organizer_name: organizer?.name || "Unknown Organizer",
    });
  } catch (error) {
    console.error("Error fetching organizer door staff:", error);
    return NextResponse.json({ error: "Failed to fetch door staff" }, { status: 500 });
  }
}

/**
 * POST /api/organizer/door-staff
 * Add a permanent door staff member to the organizer
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, organizerId } = await getUserIdAndOrganizer();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, notes, organizerId: bodyOrganizerId } = body;
    const targetOrganizerId = bodyOrganizerId || organizerId;

    if (!targetOrganizerId) {
      return NextResponse.json({ error: "No organizer found" }, { status: 404 });
    }

    if (!(await canManageOrganizerDoorStaff(userId, targetOrganizerId))) {
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
      .from("organizer_door_staff")
      .insert({
        organizer_id: targetOrganizerId,
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
      console.error("Error adding organizer door staff:", error);
      return NextResponse.json({ error: "Failed to add door staff" }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Error adding organizer door staff:", error);
    return NextResponse.json({ error: "Failed to add door staff" }, { status: 500 });
  }
}

/**
 * DELETE /api/organizer/door-staff
 * Remove or revoke a door staff member from the organizer
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, organizerId } = await getUserIdAndOrganizer();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staff_id");
    const queryOrganizerId = searchParams.get("organizerId") || organizerId;

    if (!staffId) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }

    if (!queryOrganizerId) {
      return NextResponse.json({ error: "No organizer found" }, { status: 404 });
    }

    if (!(await canManageOrganizerDoorStaff(userId, queryOrganizerId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Revoke door staff (soft delete)
    const { error } = await supabase
      .from("organizer_door_staff")
      .update({ status: "revoked" })
      .eq("id", staffId)
      .eq("organizer_id", queryOrganizerId);

    if (error) {
      console.error("Error revoking organizer door staff:", error);
      return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Door staff access revoked" });
  } catch (error) {
    console.error("Error revoking organizer door staff:", error);
    return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
  }
}

