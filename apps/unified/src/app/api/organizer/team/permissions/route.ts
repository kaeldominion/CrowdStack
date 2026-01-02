import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import type { OrganizerPermissions } from "@crowdstack/shared/types";

/**
 * PUT /api/organizer/team/permissions
 * Update permissions for a team member
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
    const { user_id, permissions } = body;

    if (!user_id || !permissions) {
      return NextResponse.json(
        { error: "user_id and permissions are required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify user is part of this organizer's team
    const { data: organizerUser } = await serviceSupabase
      .from("organizer_users")
      .select("id, organizer_id")
      .eq("organizer_id", organizerId)
      .eq("user_id", user_id)
      .single();

    if (!organizerUser) {
      return NextResponse.json(
        { error: "User is not a team member of this organizer" },
        { status: 404 }
      );
    }

    // Update permissions
    const { error: updateError } = await serviceSupabase
      .from("organizer_users")
      .update({
        permissions: permissions as OrganizerPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizerUser.id);

    if (updateError) {
      console.error("Failed to update permissions:", updateError);
      return NextResponse.json(
        { error: "Failed to update permissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update permissions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update permissions" },
      { status: 500 }
    );
  }
}

