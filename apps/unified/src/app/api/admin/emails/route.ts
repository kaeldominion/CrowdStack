import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const emailType = searchParams.get("emailType") || "";
    const templateSlug = searchParams.get("templateSlug") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Ensure reasonable limits
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role using service role to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required",
        yourRoles: roles 
      }, { status: 403 });
    }

    // Build the query with filters
    let query = serviceSupabase
      .from("email_send_logs")
      .select(`
        id,
        template_id,
        template_slug,
        recipient,
        recipient_user_id,
        subject,
        email_type,
        status,
        sent_at,
        opened_at,
        clicked_at,
        bounced_at,
        bounce_reason,
        open_count,
        click_count,
        last_opened_at,
        last_clicked_at,
        error_message,
        metadata,
        created_at,
        email_templates (
          id,
          slug,
          category
        )
      `, { count: "exact" });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (emailType) {
      query = query.eq("email_type", emailType);
    }

    if (templateSlug) {
      query = query.eq("template_slug", templateSlug);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    // Apply search filter if provided (search recipient or subject)
    if (search) {
      query = query.or(`recipient.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    // Apply ordering and pagination
    const { data: emails, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) {
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / safeLimit);
    const hasMore = safePage < totalPages;

    // Calculate stats
    const statsQuery = serviceSupabase
      .from("email_send_logs")
      .select("status, email_type, opened_at, clicked_at, bounced_at", { count: "exact" });

    // Apply same date filters for stats
    if (startDate) {
      statsQuery.gte("created_at", startDate);
    }
    if (endDate) {
      statsQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    const { data: allEmailsForStats } = await statsQuery;

    const stats = {
      total: totalCount,
      totalSent: allEmailsForStats?.filter((e) => e.status === "sent").length || 0,
      totalFailed: allEmailsForStats?.filter((e) => e.status === "failed").length || 0,
      totalBounced: allEmailsForStats?.filter((e) => e.status === "bounced").length || 0,
      totalPending: allEmailsForStats?.filter((e) => e.status === "pending").length || 0,
      totalOpened: allEmailsForStats?.filter((e) => e.opened_at).length || 0,
      totalClicked: allEmailsForStats?.filter((e) => e.clicked_at).length || 0,
      byType: {} as Record<string, number>,
    };

    // Count by email type
    allEmailsForStats?.forEach((email) => {
      const type = email.email_type || "unknown";
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    // Calculate rates
    const sentEmails = stats.totalSent;
    const openRate = sentEmails > 0 ? (stats.totalOpened / sentEmails) * 100 : 0;
    const clickRate = sentEmails > 0 ? (stats.totalClicked / sentEmails) * 100 : 0;
    const bounceRate = sentEmails > 0 ? (stats.totalBounced / sentEmails) * 100 : 0;

    // Get today's emails count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await serviceSupabase
      .from("email_send_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    return NextResponse.json({
      emails: emails || [],
      stats: {
        ...stats,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
        todayCount: todayCount || 0,
      },
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        totalPages,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error("[Admin Emails API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
