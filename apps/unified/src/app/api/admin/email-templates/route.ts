import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/admin/email-templates
 * List all email templates
 */
export async function GET(request: NextRequest) {
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

    // Get all templates
    const { data: templates, error } = await serviceSupabase
      .from("email_templates")
      .select("*")
      .order("category", { ascending: true })
      .order("slug", { ascending: true });

    if (error) {
      throw error;
    }

    // Get send stats for each template
    const templatesWithStats = await Promise.all(
      (templates || []).map(async (template) => {
        const { data: logs } = await serviceSupabase
          .from("email_send_logs")
          .select("id, status, opened_at, clicked_at")
          .eq("template_slug", template.slug);

        const sent = logs?.filter((l) => l.status === "sent").length || 0;
        const opened = logs?.filter((l) => l.opened_at !== null).length || 0;
        const clicked = logs?.filter((l) => l.clicked_at !== null).length || 0;

        return {
          ...template,
          stats: {
            sent,
            opened,
            clicked,
            open_rate: sent > 0 ? (opened / sent) * 100 : 0,
            click_rate: sent > 0 ? (clicked / sent) * 100 : 0,
          },
        };
      })
    );

    return NextResponse.json({ templates: templatesWithStats });
  } catch (error: any) {
    console.error("[Email Templates API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-templates
 * Create new email template
 */
export async function POST(request: NextRequest) {
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
      slug,
      trigger,
      category,
      target_roles,
      subject,
      html_body,
      text_body,
      variables,
      enabled,
    } = body;

    if (!slug || !trigger || !category || !subject || !html_body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existing } = await serviceSupabase
      .from("email_templates")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Template slug already exists" },
        { status: 400 }
      );
    }

    const { data: template, error } = await serviceSupabase
      .from("email_templates")
      .insert({
        slug,
        trigger,
        category,
        target_roles: target_roles || [],
        subject,
        html_body,
        text_body: text_body || null,
        variables: variables || {},
        enabled: enabled !== undefined ? enabled : true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("[Email Templates API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 }
    );
  }
}

