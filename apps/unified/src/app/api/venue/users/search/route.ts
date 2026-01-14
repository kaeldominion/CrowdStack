import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";

/**
 * GET /api/venue/users/search?q=xxx&venueId=xxx
 * Search for users by email/name to add as venue team members
 * Supports fuzzy matching for thousands of users
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

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
    let venueId = searchParams.get("venueId");

    // Get venue ID from cookie if not provided
    if (!venueId) {
      venueId = await getUserVenueId();
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const serviceSupabase = createServiceRoleClient();
    const searchTerm = query.toLowerCase().trim();
    const isEmailQuery = query.includes("@");

    let matchingUsers: any[] = [];

    // First, search in attendees table (has name field for fuzzy name search)
    const { data: attendeeMatches } = await serviceSupabase
      .from("attendees")
      .select("user_id, email, name, avatar_url")
      .not("user_id", "is", null)
      .or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .limit(20);

    if (attendeeMatches && attendeeMatches.length > 0) {
      // Get auth user details for these attendees
      const userIds = attendeeMatches.map((a) => a.user_id).filter(Boolean);
      const uniqueUserIds = [...new Set(userIds)];

      for (const userId of uniqueUserIds.slice(0, 10)) {
        const { data: { user: authUser }, error } = await serviceSupabase.auth.admin.getUserById(userId);
        if (!error && authUser) {
          const attendee = attendeeMatches.find((a) => a.user_id === userId);
          matchingUsers.push({
            ...authUser,
            attendee_name: attendee?.name,
            attendee_avatar: attendee?.avatar_url,
          });
        }
      }
    }

    // If no results from attendees or it's an email query, also search auth users directly
    if (matchingUsers.length < 5 || isEmailQuery) {
      // Fetch auth users with pagination
      let allAuthUsers: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) { // Limit to 5 pages (5000 users) for performance
        const { data: { users }, error } = await serviceSupabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

        if (error || !users || users.length === 0) {
          hasMore = false;
        } else {
          allAuthUsers = [...allAuthUsers, ...users];
          if (users.length < 1000) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      // Find matching users by email
      const emailMatches = allAuthUsers
        .filter((u) => {
          const email = u.email?.toLowerCase() || "";
          const name = (u.user_metadata?.name || "").toLowerCase();
          return email.includes(searchTerm) || name.includes(searchTerm);
        })
        .slice(0, 10);

      // Merge with existing results, avoiding duplicates
      const existingIds = new Set(matchingUsers.map((u) => u.id));
      for (const authUser of emailMatches) {
        if (!existingIds.has(authUser.id)) {
          matchingUsers.push(authUser);
        }
      }
    }

    // Limit to 10 results
    matchingUsers = matchingUsers.slice(0, 10);

    if (matchingUsers.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const userIds = matchingUsers.map((u) => u.id);

    // Get attendee profiles for names and avatars (if not already fetched)
    const { data: attendees } = await serviceSupabase
      .from("attendees")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    // Check which users are already assigned to this venue
    let assignedUserIds = new Set<string>();
    if (venueId) {
      const { data: existingUsers } = await serviceSupabase
        .from("venue_users")
        .select("user_id")
        .eq("venue_id", venueId);

      assignedUserIds = new Set(existingUsers?.map((u) => u.user_id) || []);
    }

    const usersWithDetails = matchingUsers.map((authUser) => {
      const attendee = attendees?.find((a) => a.user_id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        name: authUser.attendee_name || attendee?.name || authUser.user_metadata?.name || authUser.email?.split("@")[0],
        avatar_url: authUser.attendee_avatar || attendee?.avatar_url,
        already_assigned: assignedUserIds.has(authUser.id),
      };
    });

    return NextResponse.json({ users: usersWithDetails });
  } catch (error: any) {
    console.error("Error searching users for venue team:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search users" },
      { status: 500 }
    );
  }
}
