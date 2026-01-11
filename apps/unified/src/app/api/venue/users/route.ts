import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getVenuePermissions, hasVenuePermission } from "@crowdstack/shared/auth/venue-permissions";
import { assignUserRole } from "@crowdstack/shared/auth/roles";
import { DEFAULT_VENUE_PERMISSIONS } from "@crowdstack/shared/constants/permissions";
import type { VenuePermissions } from "@crowdstack/shared/types";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let venueId = searchParams.get("venueId");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If no venueId provided, try to get user's venue
    if (!venueId) {
      const { getUserVenueId } = await import("@/lib/data/get-user-entity");
      venueId = await getUserVenueId();
      
      if (!venueId) {
        return NextResponse.json(
          { error: "No venue found. Please specify venueId or ensure you're assigned to a venue." },
          { status: 404 }
        );
      }
    }

    // Check if user has permission to manage users for this venue
    const canManage = await hasVenuePermission(user.id, venueId, "manage_users");
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to view users for this venue" },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all users for this venue
    const { data: venueUsers, error } = await serviceSupabase
      .from("venue_users")
      .select("*")
      .eq("venue_id", venueId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching venue users:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user details from auth.users using service role
    const userIds = (venueUsers || []).map((vu: any) => vu.user_id);
    const userMap = new Map<string, { id: string; email: string; name: string | null; created_at: string }>();

    if (userIds.length > 0) {
      // Fetch each user individually to avoid pagination issues
      for (const userId of userIds) {
        try {
          const { data: authUser } = await serviceSupabase.auth.admin.getUserById(userId);
          if (authUser?.user) {
            const user = authUser.user;
            // Try to get name from user_metadata
            const name = user.user_metadata?.name ||
                         user.user_metadata?.full_name ||
                         null;
            userMap.set(userId, {
              id: user.id,
              email: user.email || "Unknown",
              name: name,
              created_at: user.created_at,
            });
          }
        } catch (err) {
          console.warn(`Could not fetch user ${userId}:`, err);
        }
      }
    }

    // Get venue name
    const { data: venue } = await serviceSupabase
      .from("venues")
      .select("name")
      .eq("id", venueId)
      .single();

    // Transform the data to match our type
    const users = (venueUsers || []).map((vu: any) => {
      const userData = userMap.get(vu.user_id);
      return {
        id: vu.id,
        venue_id: vu.venue_id,
        user_id: vu.user_id,
        role: vu.role,
        permissions: vu.permissions || DEFAULT_VENUE_PERMISSIONS,
        assigned_by: vu.assigned_by,
        assigned_at: vu.assigned_at,
        // Nested user object (for venue users page)
        user: userData,
        // Flattened fields (for admin page backwards compatibility)
        email: userData?.email,
        user_name: userData?.name,
      };
    });

    return NextResponse.json({ 
      users,
      venue_id: venueId,
      venue_name: venue?.name || "Unknown Venue",
    });
  } catch (error: any) {
    console.error("Error in GET /api/venue/users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { venueId, email, permissions } = body;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If no venueId provided, try to get user's venue
    if (!venueId) {
      const { getUserVenueId } = await import("@/lib/data/get-user-entity");
      venueId = await getUserVenueId();
      
      if (!venueId) {
        return NextResponse.json(
          { error: "No venue found. Please specify venueId or ensure you're assigned to a venue." },
          { status: 404 }
        );
      }
    }

    // Check if current user has permission to manage users
    const canManage = await hasVenuePermission(
      currentUser.id,
      venueId,
      "manage_users"
    );
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to add users to this venue" },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Find user by email - we need to check if they exist in the system
    // Note: This requires the user to have already signed up
    // We'll use a workaround - try to find them via a public table or use admin API
    let targetUserId: string | null = null;

    try {
      // Try using admin API to find user by email
      const { data: usersResponse, error: listError } = await serviceSupabase.auth.admin.listUsers();
      
      if (!listError && usersResponse?.users) {
        const foundUser = usersResponse.users.find((u) => u.email === email);
        if (foundUser) {
          targetUserId = foundUser.id;
        }
      }
    } catch (adminError) {
      console.warn("Could not use admin API to find user:", adminError);
    }

    // If we couldn't find via admin API, try checking in user_roles or attendees table
    if (!targetUserId) {
      // Check attendees table (users often have attendee records)
      const { data: attendee } = await serviceSupabase
        .from("attendees")
        .select("user_id")
        .eq("email", email)
        .not("user_id", "is", null)
        .single();

      if (attendee?.user_id) {
        targetUserId = attendee.user_id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "User with this email not found. They must sign up first." },
        { status: 404 }
      );
    }

    // Check if user already assigned
    const { data: existing } = await serviceSupabase
      .from("venue_users")
      .select("id")
      .eq("venue_id", venueId)
      .eq("user_id", targetUserId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "User is already assigned to this venue" },
        { status: 400 }
      );
    }

    // Set permissions (default if not provided)
    const userPermissions: VenuePermissions =
      permissions || DEFAULT_VENUE_PERMISSIONS;

    // Add user to venue
    const { data: venueUser, error: insertError } = await serviceSupabase
      .from("venue_users")
      .insert({
        venue_id: venueId,
        user_id: targetUserId,
        role: userPermissions.full_admin ? "admin" : "staff",
        permissions: userPermissions,
        assigned_by: currentUser.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error adding user to venue:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Grant venue_admin role if not already present
    try {
      await assignUserRole(targetUserId, "venue_admin", {
        assigned_by: currentUser.id,
        assigned_via: "venue_user_management",
      });
    } catch (roleError: any) {
      // Log but don't fail - role might already exist
      console.warn("Failed to assign venue_admin role:", roleError.message);
    }

    return NextResponse.json({ user: venueUser });
  } catch (error: any) {
    console.error("Error in POST /api/venue/users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add user" },
      { status: 500 }
    );
  }
}

