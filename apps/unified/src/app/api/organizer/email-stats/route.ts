import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

/**
 * GET /api/organizer/email-stats
 * Get email statistics for all events belonging to this organizer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json({ error: "No organizer found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events for this organizer
    const { data: events } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("organizer_id", organizerId);

    const eventIds = events?.map((e) => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({
        stats: {
          total: 0,
          totalSent: 0,
          totalFailed: 0,
          totalBounced: 0,
          totalOpened: 0,
          totalClicked: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
        },
        byEvent: [],
        byType: {},
      });
    }

    // Get all email logs for these events
    // Query by organizer_id in metadata (new enhanced metadata) or by event_id
    const { data: emailLogs, error } = await serviceSupabase
      .from("email_send_logs")
      .select("*")
      .or(
        eventIds
          .map((eventId) => `metadata->>event_id.eq.${eventId}`)
          .join(",") +
          (eventIds.length > 0 ? "," : "") +
          `metadata->>organizer_id.eq.${organizerId}`
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate stats
    const stats = {
      total: emailLogs?.length || 0,
      totalSent: emailLogs?.filter((e) => e.status === "sent").length || 0,
      totalFailed: emailLogs?.filter((e) => e.status === "failed").length || 0,
      totalBounced: emailLogs?.filter((e) => e.status === "bounced").length || 0,
      totalOpened: emailLogs?.filter((e) => e.opened_at || (e.open_count && e.open_count > 0)).length || 0,
      totalClicked: emailLogs?.filter((e) => e.clicked_at || (e.click_count && e.click_count > 0)).length || 0,
    };

    const sentEmails = stats.totalSent;
    const openRate = sentEmails > 0 ? (stats.totalOpened / sentEmails) * 100 : 0;
    const clickRate = sentEmails > 0 ? (stats.totalClicked / sentEmails) * 100 : 0;
    const bounceRate = sentEmails > 0 ? (stats.totalBounced / sentEmails) * 100 : 0;

    // Group by event
    const byEvent: Record<string, any> = {};
    emailLogs?.forEach((log: any) => {
      const eventId = log.metadata?.event_id;
      if (eventId) {
        if (!byEvent[eventId]) {
          byEvent[eventId] = {
            event_id: eventId,
            total: 0,
            sent: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
          };
        }
        byEvent[eventId].total++;
        if (log.status === "sent") byEvent[eventId].sent++;
        if (log.opened_at || (log.open_count && log.open_count > 0)) byEvent[eventId].opened++;
        if (log.clicked_at || (log.click_count && log.click_count > 0)) byEvent[eventId].clicked++;
        if (log.status === "bounced") byEvent[eventId].bounced++;
      }
    });

    // Group by email type
    const byType: Record<string, number> = {};
    emailLogs?.forEach((log: any) => {
      const type = log.email_type || log.template_slug || "unknown";
      byType[type] = (byType[type] || 0) + 1;
    });

    return NextResponse.json({
      stats: {
        ...stats,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
      },
      byEvent: Object.values(byEvent),
      byType,
    });
  } catch (error: any) {
    console.error("Error fetching organizer email stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email stats" },
      { status: 500 }
    );
  }
}
