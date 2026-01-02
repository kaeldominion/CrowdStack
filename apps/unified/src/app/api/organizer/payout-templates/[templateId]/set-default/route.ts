import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

/**
 * PUT /api/organizer/payout-templates/[templateId]/set-default
 * Set a template as the default for the organizer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
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

    const userId = await getUserId();
    const serviceSupabase = createServiceRoleClient();

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Verify template exists and get its organizer_id
    const { data: existingTemplate } = await serviceSupabase
      .from("promoter_payout_templates")
      .select("id, organizer_id")
      .eq("id", params.templateId)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // If not superadmin, verify user has access to this organizer
    if (!isSuperadmin) {
      const organizerId = await getUserOrganizerId();
      if (!organizerId || organizerId !== existingTemplate.organizer_id) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }
    }

    // Unset all other defaults for this organizer
    await serviceSupabase
      .from("promoter_payout_templates")
      .update({ is_default: false })
      .eq("organizer_id", existingTemplate.organizer_id)
      .eq("is_default", true)
      .neq("id", params.templateId);

    // Set this template as default
    const { data: template, error } = await serviceSupabase
      .from("promoter_payout_templates")
      .update({ is_default: true })
      .eq("id", params.templateId)
      .select()
      .single();

    if (error) {
      console.error("Error setting default template:", error);
      return NextResponse.json(
        { error: "Failed to set default template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to set default template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set default template" },
      { status: 500 }
    );
  }
}

