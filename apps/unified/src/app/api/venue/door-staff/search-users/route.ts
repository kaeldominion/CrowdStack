import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/venue/door-staff/search-users?q=xxx&venueId=xxx
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
    const venueId = searchParams.get("venueId");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if query looks like an email - if so, try direct lookup first
    const isEmailQuery = query.includes("@");
    let matchingUsers: any[] = [];
    const searchTerm = query.toLowerCase().trim();

    if (isEmailQuery) {
      // Try to get user by email directly (bypasses pagination issues)
      try {
        // Fetch all users with pagination to find the exact match
        let allAuthUsers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const { data: { users }, error } = await serviceSupabase.auth.admin.listUsers({
            page,
            perPage: 1000,
          });

          if (error) {
            console.error("Error fetching users:", error);
            break;
          }

          if (!users || users.length === 0) {
            hasMore = false;
          } else {
            allAuthUsers = [...allAuthUsers, ...users];
            // If we got less than 1000, we've reached the end
            if (users.length < 1000) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        const exactMatch = allAuthUsers.find(
          (u) => u.email?.toLowerCase().trim() === searchTerm
        );
        
        if (exactMatch) {
          matchingUsers = [exactMatch];
        } else {
          // Fallback: Check attendees table for recently created users
          // (new users might not appear in listUsers() immediately due to caching)
          const { data: attendee } = await serviceSupabase
            .from("attendees")
            .select("user_id, email")
            .ilike("email", searchTerm)
            .not("user_id", "is", null)
            .maybeSingle();

          if (attendee?.user_id) {
            // Get user by ID (more reliable for new users)
            const { data: { user: userById }, error: userError } = await serviceSupabase.auth.admin.getUserById(attendee.user_id);
            if (!userError && userById) {
              matchingUsers = [userById];
            }
          } else {
            // Additional fallback: Try case-insensitive search in all users
            // Sometimes emails have different casing in the database
            const caseInsensitiveMatch = allAuthUsers.find(
              (u) => u.email?.toLowerCase().trim() === searchTerm.toLowerCase().trim()
            );
            if (caseInsensitiveMatch) {
              matchingUsers = [caseInsensitiveMatch];
            }
          }
        }
      } catch (e) {
        console.error("Error in direct email lookup:", e);
      }
    }

    // If no exact match or not an email query, do fuzzy search
    if (matchingUsers.length === 0) {
      // Fetch all users with pagination to handle >1000 users
      let allAuthUsers: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data: { users }, error } = await serviceSupabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

        if (error) {
          console.error("Error fetching users:", error);
          break;
        }

        if (!users || users.length === 0) {
          hasMore = false;
        } else {
          allAuthUsers = [...allAuthUsers, ...users];
          // If we got less than 1000, we've reached the end
          if (users.length < 1000) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }
      
      // Find users matching the search term
      matchingUsers = allAuthUsers
        .filter((u) => u.email?.toLowerCase().includes(searchTerm))
        .slice(0, 10); // Limit to 10 results

      // If still no results and query looks like email, try attendees table fallback
      if (matchingUsers.length === 0 && isEmailQuery) {
        const { data: attendees } = await serviceSupabase
          .from("attendees")
          .select("user_id, email")
          .ilike("email", `%${searchTerm}%`)
          .not("user_id", "is", null)
          .limit(10);

        if (attendees && attendees.length > 0) {
          // Get users by their IDs
          const userIds = attendees.map((a) => a.user_id).filter(Boolean);
          const userPromises = userIds.map((userId) =>
            serviceSupabase.auth.admin.getUserById(userId).then(({ data, error }) => {
              if (!error && data?.user) return data.user;
              return null;
            })
          );
          const foundUsers = (await Promise.all(userPromises)).filter(Boolean);
          matchingUsers = foundUsers.slice(0, 10);
        }
      }
    }

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
    if (venueId) {
      const { data: existingStaff } = await serviceSupabase
        .from("venue_door_staff")
        .select("user_id")
        .eq("venue_id", venueId)
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

