import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/settings
 * Get organizer settings (profile + team members)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
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

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get organizer profile
    const { data: organizer, error: organizerError } = await serviceSupabase
      .from("organizers")
      .select("*")
      .eq("id", organizerId)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json(
        { error: "Failed to fetch organizer" },
        { status: 500 }
      );
    }

    // Get users with access to this organizer (from organizer_users)
    const { data: organizerUsers } = await serviceSupabase
      .from("organizer_users")
      .select("*")
      .eq("organizer_id", organizerId)
      .order("assigned_at", { ascending: true });

    // Include the owner (created_by) in the list if not already in organizer_users
    const allUserIds = new Set<string>();
    if (organizer.created_by) {
      allUserIds.add(organizer.created_by);
    }
    (organizerUsers || []).forEach((ou: any) => {
      allUserIds.add(ou.user_id);
    });

    // Get user details from auth.users, profiles, and attendees
    const userIdsArray = Array.from(allUserIds);
    const userMap = new Map<string, { email: string; name: string; avatar_url: string | null }>();

    if (userIdsArray.length > 0) {
      // Get user emails from auth.users
      const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();
      
      // Get user profiles for avatars
      const { data: profiles } = await serviceSupabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", userIdsArray);

      const profileMap = new Map<string, string | null>();
      (profiles || []).forEach((profile: any) => {
        profileMap.set(profile.id, profile.avatar_url);
      });

      // Get attendee names (which have the actual user names) - this is the most reliable source
      const { data: attendees } = await serviceSupabase
        .from("attendees")
        .select("user_id, name, surname, avatar_url")
        .in("user_id", userIdsArray);

      const attendeeMap = new Map<string, { name: string; avatar_url: string | null }>();
      (attendees || []).forEach((attendee: any) => {
        const fullName = attendee.surname 
          ? `${attendee.name} ${attendee.surname}`.trim()
          : attendee.name;
        attendeeMap.set(attendee.user_id, { 
          name: fullName, 
          avatar_url: attendee.avatar_url || null 
        });
      });

      if (authUsers?.users) {
        authUsers.users.forEach((authUser) => {
          if (allUserIds.has(authUser.id)) {
            const email = authUser.email || "";
            
            // Try to get name from attendees first (most reliable), then user_metadata, then email
            const attendeeInfo = attendeeMap.get(authUser.id);
            const name = attendeeInfo?.name ||
                        authUser.user_metadata?.name || 
                        authUser.user_metadata?.full_name || 
                        (email ? email.split("@")[0] : null) || 
                        "Unknown";
            
            // Prefer attendee avatar, then profile avatar
            const avatar_url = attendeeInfo?.avatar_url || 
                              profileMap.get(authUser.id) || 
                              null;
            
            userMap.set(authUser.id, { email, name, avatar_url });
          }
        });
      }
      
      // For any user IDs not found in auth.users, try to get from attendees directly
      userIdsArray.forEach((userId) => {
        if (!userMap.has(userId)) {
          const attendeeInfo = attendeeMap.get(userId);
          if (attendeeInfo) {
            userMap.set(userId, {
              email: "",
              name: attendeeInfo.name,
              avatar_url: attendeeInfo.avatar_url,
            });
          }
        }
      });
    }

    // Format team members with user info
    const teamMembers: any[] = [];
    const currentUserId = user.id;

    // Add owner first if they exist
    if (organizer.created_by) {
      const ownerInfo = userMap.get(organizer.created_by) || { email: null, name: "Unknown", avatar_url: null };
      const ownerInUsers = (organizerUsers || []).find((ou: any) => ou.user_id === organizer.created_by);
      
      teamMembers.push({
        id: ownerInUsers?.id || `owner-${organizer.created_by}`,
        user_id: organizer.created_by,
        name: ownerInfo.name,
        email: ownerInfo.email,
        avatar_url: ownerInfo.avatar_url,
        role: "Owner",
        is_owner: true,
        assigned_at: organizer.created_at,
        permissions: null, // Owner has all permissions
        is_current_user: organizer.created_by === currentUserId,
      });
    }

    // Add other team members (excluding owner if already added)
    (organizerUsers || []).forEach((ou: any) => {
      if (ou.user_id !== organizer.created_by) {
        const userInfo = userMap.get(ou.user_id) || { email: null, name: "Unknown", avatar_url: null };
        const permissions = ou.permissions as any;
        const isFullAdmin = permissions?.full_admin === true;
        
        teamMembers.push({
          id: ou.id,
          user_id: ou.user_id,
          name: userInfo.name,
          email: userInfo.email,
          avatar_url: userInfo.avatar_url,
          role: isFullAdmin ? "Admin" : (ou.role || "Team Member"),
          is_owner: false,
          assigned_at: ou.assigned_at,
          assigned_by: ou.assigned_by,
          permissions: permissions,
          is_current_user: ou.user_id === currentUserId,
        });
      }
    });

    return NextResponse.json({
      organizer: {
        ...organizer,
        team_members: teamMembers || [],
      },
      current_user_id: currentUserId,
    });
  } catch (error: any) {
    console.error("Failed to fetch organizer settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizer/settings
 * Update organizer profile
 */
export async function PUT(request: NextRequest) {
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

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { organizer } = body;

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer data required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Update organizer profile (only allow specific fields)
    const updateData: any = {};
    const allowedFields = [
      "name",
      "company_name",
      "bio",
      "website",
      "instagram_url",
      "twitter_url",
      "facebook_url",
      "logo_url",
    ];

    for (const field of allowedFields) {
      if (field in organizer) {
        updateData[field] = organizer[field] || null;
      }
    }

    const { error: updateError } = await serviceSupabase
      .from("organizers")
      .update(updateData)
      .eq("id", organizerId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update organizer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update organizer settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

