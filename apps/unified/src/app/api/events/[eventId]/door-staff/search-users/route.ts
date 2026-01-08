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

/**
 * GET /api/events/[eventId]/door-staff/search-users
 * Search for users by email (fuzzy match) for door staff assignment
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const supabase = createServiceRoleClient();

    // Check if query looks like an email - if so, try direct lookup first
    const isEmailQuery = query.includes("@");
    let matchingUsers: any[] = [];

    if (isEmailQuery) {
      // Try to get user by email directly (bypasses pagination issues)
      try {
        // Fetch all users with pagination to find the exact match
        let allAuthUsers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const { data: { users }, error } = await supabase.auth.admin.listUsers({
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

        console.log(`[Door Staff Search] Searching for email: "${query}", Total users fetched: ${allAuthUsers.length}`);

        const exactMatch = allAuthUsers.find(
          (u) => u.email?.toLowerCase().trim() === query
        );
        
        if (exactMatch) {
          matchingUsers = [exactMatch];
        } else {
          // Fallback: Check attendees table for recently created users
          // (new users might not appear in listUsers() immediately due to caching)
          const { data: attendee } = await supabase
            .from("attendees")
            .select("user_id, email")
            .ilike("email", query)
            .not("user_id", "is", null)
            .maybeSingle();

          if (attendee?.user_id) {
            // Get user by ID (more reliable for new users)
            const { data: { user: userById }, error: userError } = await supabase.auth.admin.getUserById(attendee.user_id);
            if (!userError && userById) {
              matchingUsers = [userById];
            }
          } else {
            // Additional fallback: Try case-insensitive search in all users
            // Sometimes emails have different casing in the database
            const caseInsensitiveMatch = allAuthUsers.find(
              (u) => u.email?.toLowerCase().trim() === query.toLowerCase().trim()
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
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
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

      // Filter users by email fuzzy match
      matchingUsers = allAuthUsers
        .filter((user) => {
          if (!user.email) return false;
          const email = user.email.toLowerCase();
          return email.includes(query);
        })
        .slice(0, 10); // Limit to 10 results

      // If still no results and query looks like email, try attendees table fallback
      if (matchingUsers.length === 0 && isEmailQuery) {
        const { data: attendees } = await supabase
          .from("attendees")
          .select("user_id, email")
          .ilike("email", `%${query}%`)
          .not("user_id", "is", null)
          .limit(10);

        if (attendees && attendees.length > 0) {
          // Get users by their IDs
          const userIds = attendees.map((a) => a.user_id).filter(Boolean);
          const userPromises = userIds.map((userId) =>
            supabase.auth.admin.getUserById(userId).then(({ data, error }) => {
              if (!error && data?.user) return data.user;
              return null;
            })
          );
          const foundUsers = (await Promise.all(userPromises)).filter(Boolean);
          matchingUsers = foundUsers.slice(0, 10);
        }
      }
    }

    // Get attendee profiles for these users
    const userIds = matchingUsers.map((u) => u.id);
    const { data: attendees } = await supabase
      .from("attendees")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const attendeeMap = new Map(
      (attendees || []).map((a: { user_id: string; name?: string; avatar_url?: string }) => [a.user_id, a])
    );

    // Get existing door staff for this event to mark already assigned
    const { data: existingStaff } = await supabase
      .from("event_door_staff")
      .select("user_id")
      .eq("event_id", params.eventId)
      .eq("status", "active");

    const existingStaffIds = new Set(existingStaff?.map((s) => s.user_id) || []);

    // Format results
    const users = matchingUsers.map((user) => {
      const attendee = attendeeMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        name: attendee?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Unknown",
        avatar_url: attendee?.avatar_url,
        already_assigned: existingStaffIds.has(user.id),
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}

