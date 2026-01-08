import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/team/search-users?email=xxx
 * Search for users by email to add to organizer team
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

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || email.trim().length === 0) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Search for user by email (fuzzy matching)
    const { data: authUsers, error: userError } = await serviceSupabase.auth.admin.listUsers();
    if (userError) {
      throw userError;
    }

    const searchTerm = email.toLowerCase().trim();
    
    // First try exact match
    let matchingUser = authUsers.users.find(
      (u) => u.email?.toLowerCase() === searchTerm
    );

    // If no exact match, try fuzzy matching (email contains search term)
    if (!matchingUser) {
      matchingUser = authUsers.users.find(
        (u) => u.email?.toLowerCase().includes(searchTerm)
      );
    }

    // If still no match, try matching the part before @ (username part)
    if (!matchingUser && searchTerm.includes("@")) {
      const usernamePart = searchTerm.split("@")[0];
      matchingUser = authUsers.users.find(
        (u) => u.email?.toLowerCase().split("@")[0].includes(usernamePart)
      );
    }

    if (!matchingUser) {
      return NextResponse.json({
        found: false,
        message: "User not found. They need to sign up first.",
      });
    }

    // Get user's attendee profile if exists
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id, name, avatar_url")
      .eq("user_id", matchingUser.id)
      .maybeSingle();

    // Check if user is already assigned to this organizer
    const organizerId = await getUserOrganizerId();
    if (organizerId) {
      const { data: existingAssignment } = await serviceSupabase
        .from("organizer_users")
        .select("id")
        .eq("organizer_id", organizerId)
        .eq("user_id", matchingUser.id)
        .maybeSingle();

      if (existingAssignment) {
        return NextResponse.json({
          found: true,
          alreadyAdded: true,
          message: "User is already on your team",
          user: {
            id: matchingUser.id,
            email: matchingUser.email,
            name: attendee?.name || matchingUser.email?.split("@")[0] || "User",
            avatar_url: attendee?.avatar_url || null,
          },
        });
      }
    }

    return NextResponse.json({
      found: true,
      alreadyAdded: false,
      user: {
        id: matchingUser.id,
        email: matchingUser.email,
        name: attendee?.name || matchingUser.email?.split("@")[0] || "User",
        avatar_url: attendee?.avatar_url || null,
      },
    });
  } catch (error: any) {
    console.error("Failed to search users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search users" },
      { status: 500 }
    );
  }
}

