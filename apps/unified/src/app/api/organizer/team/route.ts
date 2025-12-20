import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * POST /api/organizer/team
 * Add a new team member
 */
export async function POST(request: NextRequest) {
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
    const { name, role, avatar_url, email, user_id } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // If user_id is provided, add user to organizer_users (gives them access)
    if (user_id) {
      // Check if already assigned
      const { data: existingAssignment } = await serviceSupabase
        .from("organizer_users")
        .select("id")
        .eq("organizer_id", organizerId)
        .eq("user_id", user_id)
        .maybeSingle();

      if (!existingAssignment) {
        // Add user to organizer_users with default permissions
        const { FULL_ADMIN_ORGANIZER_PERMISSIONS } = await import("@crowdstack/shared/constants/permissions");
        const { error: assignError } = await serviceSupabase
          .from("organizer_users")
          .insert({
            organizer_id: organizerId,
            user_id: user_id,
            role: "admin",
            permissions: FULL_ADMIN_ORGANIZER_PERMISSIONS,
            assigned_by: user.id,
          });

        if (assignError) {
          console.error("Failed to assign user to organizer:", assignError);
          return NextResponse.json(
            { error: "Failed to assign user to organizer" },
            { status: 500 }
          );
        }

        // Assign event_organizer role to the user
        const { assignUserRole } = await import("@crowdstack/shared/auth/roles");
        try {
          await assignUserRole(user_id, "event_organizer", {
            organizer_id: organizerId,
            assigned_by: user.id,
          });
        } catch (roleError: any) {
          console.error("Failed to assign event_organizer role:", roleError);
          // Continue anyway - organizer_users entry was created, role assignment can be retried
        }
      } else {
        // User already assigned, but ensure they have the event_organizer role
        const { assignUserRole } = await import("@crowdstack/shared/auth/roles");
        try {
          await assignUserRole(user_id, "event_organizer", {
            organizer_id: organizerId,
            assigned_by: user.id,
          });
        } catch (roleError: any) {
          console.error("Failed to assign event_organizer role:", roleError);
          // Continue - role might already exist
        }
      }
      
      // Return success - user is now assigned to organizer with role
      // No need to create organizer_team_members entry when user_id is provided
      return NextResponse.json({ 
        success: true,
        message: "User added to organizer team successfully"
      });
    }

    // If no user_id provided, create a display-only team member (for public display purposes)
    // This is a legacy path - ideally all team members should be actual users
    // Get current max display_order
    const { data: existingMembers } = await serviceSupabase
      .from("organizer_team_members")
      .select("display_order")
      .eq("organizer_id", organizerId)
      .order("display_order", { ascending: false })
      .limit(1);

    const maxOrder = existingMembers?.[0]?.display_order || 0;

    const { data: teamMember, error } = await serviceSupabase
      .from("organizer_team_members")
      .insert({
        organizer_id: organizerId,
        name,
        role: role || null,
        avatar_url: avatar_url || null,
        email: email || null,
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ team_member: teamMember });
  } catch (error: any) {
    console.error("Failed to create team member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create team member" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizer/team
 * Update a team member
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
    const { id, name, role, avatar_url, email, display_order } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify team member belongs to this organizer
    const { data: existing } = await serviceSupabase
      .from("organizer_team_members")
      .select("organizer_id")
      .eq("id", id)
      .single();

    if (!existing || existing.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role || null;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url || null;
    if (email !== undefined) updateData.email = email || null;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data: teamMember, error } = await serviceSupabase
      .from("organizer_team_members")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ team_member: teamMember });
  } catch (error: any) {
    console.error("Failed to update team member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update team member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizer/team
 * Delete a team member
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("user_id");

    if (!id && !userId) {
      return NextResponse.json(
        { error: "Team member ID or user_id is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // If user_id is provided, remove from organizer_users
    if (userId) {
      // Verify user belongs to this organizer
      const { data: existing } = await serviceSupabase
        .from("organizer_users")
        .select("id, user_id")
        .eq("organizer_id", organizerId)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: "Team member not found" },
          { status: 404 }
        );
      }

      // Remove user from organizer_users (this removes their access)
      // Note: We don't remove the event_organizer role here because they might have access to other organizers
      // If you want to remove the role when they're removed from all organizers, that logic would go elsewhere
      const { error } = await serviceSupabase
        .from("organizer_users")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json(
          { error: "Failed to remove team member" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Legacy path: Delete from organizer_team_members (display-only entries)
    // Verify team member belongs to this organizer
    const { data: existing } = await serviceSupabase
      .from("organizer_team_members")
      .select("organizer_id, avatar_url")
      .eq("id", id)
      .single();

    if (!existing || existing.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Delete avatar from storage if exists
    if (existing.avatar_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        // Extract path from URL
        const urlParts = existing.avatar_url.split("/organizer-images/");
        if (urlParts.length > 1) {
          await deleteFromStorage("organizer-images", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete avatar from storage:", storageError);
        // Continue with deletion even if storage delete fails
      }
    }

    const { error } = await serviceSupabase
      .from("organizer_team_members")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete team member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete team member" },
      { status: 500 }
    );
  }
}

