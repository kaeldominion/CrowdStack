import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { assignUserRole, removeUserRole } from "@crowdstack/shared/auth/roles";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { entityId, entityType, action } = body; // action: "assign" | "unassign"

    // Verify admin access
    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    const junctionTable = entityType === "venue" ? "venue_users" : "organizer_users";
    const entityIdField = entityType === "venue" ? "venue_id" : "organizer_id";
    const requiredRole = entityType === "venue" ? "venue_admin" : "event_organizer";

    // Get current admin user
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (action === "assign") {
      // Assign user to venue/organizer in junction table
      const { error: junctionError } = await serviceSupabase
        .from(junctionTable)
        .upsert({
          user_id: userId,
          [entityIdField]: entityId,
          role: "admin",
          assigned_by: adminUser?.id || null,
        }, {
          onConflict: `${entityIdField},user_id`,
        });

      if (junctionError) {
        return NextResponse.json({ error: junctionError.message }, { status: 500 });
      }

      // Automatically grant the required role if user doesn't have it
      try {
        await assignUserRole(userId, requiredRole as any, {
          assigned_by: adminUser?.id || null,
          assigned_via: "admin_ui",
        });
      } catch (roleError: any) {
        // Log but don't fail - role might already exist
        console.warn(`Failed to assign role ${requiredRole}:`, roleError.message);
      }
    } else if (action === "unassign") {
      // Check if user has other assignments before removing role
      const { data: otherAssignments } = await serviceSupabase
        .from(junctionTable)
        .select(entityIdField)
        .eq("user_id", userId)
        .neq(entityIdField, entityId);

      // Remove assignment from junction table
      const { error: deleteError } = await serviceSupabase
        .from(junctionTable)
        .delete()
        .eq("user_id", userId)
        .eq(entityIdField, entityId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      // If no other assignments, optionally remove the role (or keep it for convenience)
      // For now, we'll keep the role even if unassigned - admin can manually remove it if needed
      // This is safer in case they get reassigned soon
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update assignment" },
      { status: 500 }
    );
  }
}

