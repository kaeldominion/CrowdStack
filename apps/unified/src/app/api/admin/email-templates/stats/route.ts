import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/admin/email-templates/stats
 * Get email statistics and logs with grouping options
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get("groupBy") || "template"; // template, date, status, category
    const templateSlug = searchParams.get("template");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query for email send logs
    let query = serviceSupabase
      .from("email_send_logs")
      .select(`
        id,
        template_slug,
        recipient,
        recipient_user_id,
        subject,
        status,
        sent_at,
        opened_at,
        clicked_at,
        error_message,
        created_at
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (templateSlug) {
      query = query.eq("template_slug", templateSlug);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = serviceSupabase
      .from("email_send_logs")
      .select("*", { count: "exact", head: true });

    if (templateSlug) {
      countQuery = countQuery.eq("template_slug", templateSlug);
    }
    if (startDate) {
      countQuery = countQuery.gte("created_at", startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte("created_at", endDate);
    }

    const { count: totalCount } = await countQuery;

    // Calculate overall stats
    const { data: allLogs } = await serviceSupabase
      .from("email_send_logs")
      .select("status, opened_at, clicked_at, template_slug, created_at");

    const totalSent = allLogs?.filter((l) => l.status === "sent").length || 0;
    const totalOpened = allLogs?.filter((l) => l.opened_at !== null).length || 0;
    const totalClicked = allLogs?.filter((l) => l.clicked_at !== null).length || 0;
    const totalFailed = allLogs?.filter((l) => l.status === "failed").length || 0;

    // Group by template
    const byTemplate: Record<string, any> = {};
    if (allLogs) {
      allLogs.forEach((log) => {
        if (!byTemplate[log.template_slug]) {
          byTemplate[log.template_slug] = {
            template_slug: log.template_slug,
            sent: 0,
            opened: 0,
            clicked: 0,
            failed: 0,
          };
        }
        if (log.status === "sent") byTemplate[log.template_slug].sent++;
        if (log.opened_at) byTemplate[log.template_slug].opened++;
        if (log.clicked_at) byTemplate[log.template_slug].clicked++;
        if (log.status === "failed") byTemplate[log.template_slug].failed++;
      });
    }

    // Group by date (daily)
    const byDate: Record<string, any> = {};
    if (allLogs) {
      allLogs.forEach((log) => {
        const date = new Date(log.created_at).toISOString().split("T")[0];
        if (!byDate[date]) {
          byDate[date] = {
            date,
            sent: 0,
            opened: 0,
            clicked: 0,
            failed: 0,
          };
        }
        if (log.status === "sent") byDate[date].sent++;
        if (log.opened_at) byDate[date].opened++;
        if (log.clicked_at) byDate[date].clicked++;
        if (log.status === "failed") byDate[date].failed++;
      });
    }

    // Group by status
    const byStatus = {
      sent: totalSent,
      failed: totalFailed,
      pending: allLogs?.filter((l) => l.status === "pending").length || 0,
    };

    // Get template categories for grouping
    const { data: templates } = await serviceSupabase
      .from("email_templates")
      .select("slug, category");

    const byCategory: Record<string, any> = {};
    if (templates && allLogs) {
      templates.forEach((template) => {
        if (!byCategory[template.category]) {
          byCategory[template.category] = {
            category: template.category,
            sent: 0,
            opened: 0,
            clicked: 0,
            failed: 0,
          };
        }
      });

      allLogs.forEach((log) => {
        const template = templates.find((t) => t.slug === log.template_slug);
        if (template && byCategory[template.category]) {
          if (log.status === "sent") byCategory[template.category].sent++;
          if (log.opened_at) byCategory[template.category].opened++;
          if (log.clicked_at) byCategory[template.category].clicked++;
          if (log.status === "failed") byCategory[template.category].failed++;
        }
      });
    }

    // Calculate rates for grouped data
    Object.values(byTemplate).forEach((group: any) => {
      group.open_rate = group.sent > 0 ? (group.opened / group.sent) * 100 : 0;
      group.click_rate = group.sent > 0 ? (group.clicked / group.sent) * 100 : 0;
    });

    Object.values(byDate).forEach((group: any) => {
      group.open_rate = group.sent > 0 ? (group.opened / group.sent) * 100 : 0;
      group.click_rate = group.sent > 0 ? (group.clicked / group.sent) * 100 : 0;
    });

    Object.values(byCategory).forEach((group: any) => {
      group.open_rate = group.sent > 0 ? (group.opened / group.sent) * 100 : 0;
      group.click_rate = group.sent > 0 ? (group.clicked / group.sent) * 100 : 0;
    });

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
      },
      overall: {
        total_sent: totalSent,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        total_failed: totalFailed,
        open_rate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        click_rate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      },
      grouped: {
        by_template: Object.values(byTemplate),
        by_date: Object.values(byDate).sort((a: any, b: any) =>
          b.date.localeCompare(a.date)
        ),
        by_status: byStatus,
        by_category: Object.values(byCategory),
      },
    });
  } catch (error: any) {
    console.error("[Email Stats API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email stats" },
      { status: 500 }
    );
  }
}

