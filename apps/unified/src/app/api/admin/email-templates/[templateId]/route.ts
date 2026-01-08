import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/admin/email-templates/[templateId]
 * Get single email template
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    if (!roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: template, error } = await serviceSupabase
      .from("email_templates")
      .select("*")
      .eq("id", params.templateId)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("[Email Template API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch template" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/email-templates/[templateId]
 * Update email template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    if (!roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      trigger,
      category,
      target_roles,
      subject,
      html_body,
      text_body,
      variables,
      enabled,
    } = body;

    // Get current template to increment version
    const { data: current } = await serviceSupabase
      .from("email_templates")
      .select("version")
      .eq("id", params.templateId)
      .single();

    const { data: template, error } = await serviceSupabase
      .from("email_templates")
      .update({
        trigger,
        category,
        target_roles,
        subject,
        html_body,
        text_body,
        variables,
        enabled,
        version: (current?.version || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.templateId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("[Email Template API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/email-templates/[templateId]
 * Delete email template (soft delete by disabling)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    if (!roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by disabling
    const { data: template, error } = await serviceSupabase
      .from("email_templates")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.templateId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("[Email Template API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}

