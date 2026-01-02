import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/payout-templates/[templateId]
 * Get a single payout template
 */
export async function GET(
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

    let template;
    let error;

    if (isSuperadmin) {
      // Superadmins can access any template
      const { data, error: err } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("*")
        .eq("id", params.templateId)
        .single();
      template = data;
      error = err;
    } else {
      // Regular organizers can only access their own templates
      const organizerId = await getUserOrganizerId();
      if (!organizerId) {
        return NextResponse.json(
          { error: "No organizer found for user" },
          { status: 404 }
        );
      }

      const { data, error: err } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("*")
        .eq("id", params.templateId)
        .eq("organizer_id", organizerId)
        .single();
      template = data;
      error = err;
    }

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to fetch payout template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizer/payout-templates/[templateId]
 * Update a payout template
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

    const body = await request.json();
    const {
      name,
      description,
      currency,
      per_head_rate,
      per_head_min,
      per_head_max,
      fixed_fee,
      minimum_guests,
      below_minimum_percent,
      bonus_threshold,
      bonus_amount,
      bonus_tiers,
      is_default,
    } = body;

    // Verify template exists and user has access
    let existingTemplate;
    if (isSuperadmin) {
      const { data } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("id, organizer_id")
        .eq("id", params.templateId)
        .single();
      existingTemplate = data;
    } else {
      const organizerId = await getUserOrganizerId();
      if (!organizerId) {
        return NextResponse.json(
          { error: "No organizer found for user" },
          { status: 404 }
        );
      }
      const { data } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("id, organizer_id")
        .eq("id", params.templateId)
        .eq("organizer_id", organizerId)
        .single();
      existingTemplate = data;
    }

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default === true) {
      await serviceSupabase
        .from("promoter_payout_templates")
        .update({ is_default: false })
        .eq("organizer_id", existingTemplate.organizer_id)
        .eq("is_default", true)
        .neq("id", params.templateId);
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (currency !== undefined) updateData.currency = currency || null;
    if (per_head_rate !== undefined) updateData.per_head_rate = per_head_rate !== null && per_head_rate !== "" ? parseFloat(per_head_rate) : null;
    if (per_head_min !== undefined) updateData.per_head_min = per_head_min !== null && per_head_min !== "" ? parseInt(per_head_min) : null;
    if (per_head_max !== undefined) updateData.per_head_max = per_head_max !== null && per_head_max !== "" ? parseInt(per_head_max) : null;
    if (fixed_fee !== undefined) updateData.fixed_fee = fixed_fee !== null && fixed_fee !== "" ? parseFloat(fixed_fee) : null;
    if (minimum_guests !== undefined) updateData.minimum_guests = minimum_guests !== null && minimum_guests !== "" ? parseInt(minimum_guests) : null;
    if (below_minimum_percent !== undefined) updateData.below_minimum_percent = below_minimum_percent !== null && below_minimum_percent !== "" ? parseFloat(below_minimum_percent) : null;
    if (bonus_threshold !== undefined) updateData.bonus_threshold = bonus_threshold !== null && bonus_threshold !== "" ? parseInt(bonus_threshold) : null;
    if (bonus_amount !== undefined) updateData.bonus_amount = bonus_amount !== null && bonus_amount !== "" ? parseFloat(bonus_amount) : null;
    if (bonus_tiers !== undefined) updateData.bonus_tiers = bonus_tiers && Array.isArray(bonus_tiers) && bonus_tiers.length > 0 ? bonus_tiers : null;
    if (is_default !== undefined) updateData.is_default = is_default === true;

    // Update the template
    let query = serviceSupabase
      .from("promoter_payout_templates")
      .update(updateData)
      .eq("id", params.templateId);
    
    // Only filter by organizer_id if not superadmin
    if (!isSuperadmin) {
      query = query.eq("organizer_id", existingTemplate.organizer_id);
    }
    
    const { data: template, error } = await query.select().single();

    if (error) {
      console.error("Error updating payout template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to update payout template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizer/payout-templates/[templateId]
 * Delete a payout template
 */
export async function DELETE(
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

    // Verify template exists and user has access
    let existingTemplate;
    if (isSuperadmin) {
      const { data } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("id, organizer_id")
        .eq("id", params.templateId)
        .single();
      existingTemplate = data;
    } else {
      const organizerId = await getUserOrganizerId();
      if (!organizerId) {
        return NextResponse.json(
          { error: "No organizer found for user" },
          { status: 404 }
        );
      }
      const { data } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("id, organizer_id")
        .eq("id", params.templateId)
        .eq("organizer_id", organizerId)
        .single();
      existingTemplate = data;
    }

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Delete the template
    let query = serviceSupabase
      .from("promoter_payout_templates")
      .delete()
      .eq("id", params.templateId);
    
    // Only filter by organizer_id if not superadmin
    if (!isSuperadmin) {
      query = query.eq("organizer_id", existingTemplate.organizer_id);
    }
    
    const { error } = await query;

    if (error) {
      console.error("Error deleting payout template:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete payout template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}

