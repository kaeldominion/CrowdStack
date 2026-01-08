import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/test/email-stats
 * Test endpoint to check email logging stats
 * Shows recent email logs and their tracking status
 * 
 * Authentication: Uses cookies (Supabase session) OR service role key in header
 * For testing: Set X-Service-Role-Key header with SUPABASE_SERVICE_ROLE_KEY
 * 
 * Query params:
 *   - limit: number of logs to return (default: 20)
 *   - eventId: filter by event_id in metadata
 *   - templateSlug: filter by template_slug
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    // Allow service role key for testing (bypass auth)
    const serviceRoleKey = request.headers.get("x-service-role-key");
    if (serviceRoleKey && serviceRoleKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Service role key provided - allow access
    } else {
      // Check normal authentication
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { 
            error: "Unauthorized",
            hint: "Either log in via browser or provide X-Service-Role-Key header"
          },
          { status: 401 }
        );
      }

      // Check if user is superadmin
      const serviceSupabase = createServiceRoleClient();
      const { data: userRoles } = await serviceSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRoleNames = userRoles?.map((r) => r.role) || [];
      if (!userRoleNames.includes("superadmin")) {
        return NextResponse.json({ error: "Forbidden: Superadmin role required" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const eventId = searchParams.get("eventId");
    const templateSlug = searchParams.get("templateSlug");

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("email_send_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventId) {
      query = query.eq("metadata->>event_id", eventId);
    }

    if (templateSlug) {
      query = query.eq("template_slug", templateSlug);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate summary stats
    const stats = {
      total: logs?.length || 0,
      sent: logs?.filter((l) => l.status === "sent").length || 0,
      pending: logs?.filter((l) => l.status === "pending").length || 0,
      failed: logs?.filter((l) => l.status === "failed").length || 0,
      bounced: logs?.filter((l) => l.status === "bounced").length || 0,
      opened: logs?.filter((l) => l.opened_at).length || 0,
      clicked: logs?.filter((l) => l.clicked_at).length || 0,
      withPostmarkId: logs?.filter((l) => (l.metadata as any)?.postmark_message_id).length || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      logs: logs?.map((log) => ({
        id: log.id,
        template_slug: log.template_slug,
        recipient: log.recipient,
        subject: log.subject,
        status: log.status,
        sent_at: log.sent_at,
        opened_at: log.opened_at,
        clicked_at: log.clicked_at,
        postmark_message_id: (log.metadata as any)?.postmark_message_id,
        event_id: (log.metadata as any)?.event_id,
        created_at: log.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching email stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email stats" },
      { status: 500 }
    );
  }
}

