import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/organizer/door-staff/search-users?q=xxx&organizerId=xxx
 * Search for users by email to add as door staff
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const organizerId = searchParams.get("organizerId");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const serviceSupabase = createServiceRoleClient();

    // Search for users by email
    const { data: authData } = await serviceSupabase.auth.admin.listUsers();
    if (!authData?.users) {
      return NextResponse.json({ users: [] });
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Find users matching the search term
    const matchingUsers = authData.users
      .filter((u) => u.email?.toLowerCase().includes(searchTerm))
      .slice(0, 10); // Limit to 10 results

    if (matchingUsers.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const userIds = matchingUsers.map((u) => u.id);

    // Get attendee profiles for names and avatars
    const { data: attendees } = await serviceSupabase
      .from("attendees")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    // Check which users are already assigned as door staff
    let assignedUserIds = new Set<string>();
    if (organizerId) {
      const { data: existingStaff } = await serviceSupabase
        .from("organizer_door_staff")
        .select("user_id")
        .eq("organizer_id", organizerId)
        .eq("status", "active");
      
      assignedUserIds = new Set(existingStaff?.map((s) => s.user_id) || []);
    }

    const usersWithDetails = matchingUsers.map((authUser) => {
      const attendee = attendees?.find((a) => a.user_id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        name: attendee?.name || authUser.user_metadata?.name || authUser.email?.split("@")[0],
        avatar_url: attendee?.avatar_url,
        already_assigned: assignedUserIds.has(authUser.id),
      };
    });

    return NextResponse.json({ users: usersWithDetails });
  } catch (error: any) {
    console.error("Error searching users for door staff:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search users" },
      { status: 500 }
    );
  }
}

