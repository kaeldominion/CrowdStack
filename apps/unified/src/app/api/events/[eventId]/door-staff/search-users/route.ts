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

    // Get all users from auth (we'll filter in memory for fuzzy search)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    // Filter users by email fuzzy match
    const matchingUsers = authUsers
      .filter((user) => {
        if (!user.email) return false;
        const email = user.email.toLowerCase();
        // Fuzzy match: check if query appears anywhere in email
        return email.includes(query);
      })
      .slice(0, 10); // Limit to 10 results

    // Get attendee profiles for these users
    const userIds = matchingUsers.map((u) => u.id);
    const { data: attendees } = await supabase
      .from("attendees")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const attendeeMap = new Map(attendees?.map((a) => [a.user_id, a]) || []);

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

