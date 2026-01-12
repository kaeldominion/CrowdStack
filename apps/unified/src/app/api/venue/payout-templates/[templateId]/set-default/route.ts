import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

/**
 * PUT /api/venue/payout-templates/[templateId]/set-default
 * Set a template as the default for the venue
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
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

    // Verify template exists and get its venue_id
    const { data: existingTemplate } = await serviceSupabase
      .from("promoter_payout_templates")
      .select("id, venue_id")
      .eq("id", params.templateId)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (!existingTemplate.venue_id) {
      return NextResponse.json(
        { error: "Template is not a venue template" },
        { status: 400 }
      );
    }

    // If not superadmin, verify user has access to this venue
    if (!isSuperadmin) {
      const venueId = await getUserVenueId();
      if (!venueId || venueId !== existingTemplate.venue_id) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }
    }

    // Unset all other defaults for this venue
    await serviceSupabase
      .from("promoter_payout_templates")
      .update({ is_default: false })
      .eq("venue_id", existingTemplate.venue_id)
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
