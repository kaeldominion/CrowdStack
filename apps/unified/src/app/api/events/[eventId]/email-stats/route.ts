import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { canUploadPhotosToEvent } from "@crowdstack/shared/auth/photo-permissions";

/**
 * GET /api/events/[eventId]/email-stats
 * Get email delivery statistics for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - same as photo management
    if (!(await canUploadPhotosToEvent(params.eventId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all email logs for this event from email_send_logs
    // Query by event_id in metadata JSONB field
    const { data: emailLogs, error } = await serviceSupabase
      .from("email_send_logs")
      .select("*")
      .eq("metadata->>event_id", params.eventId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Group by template_slug (which indicates email type) and calculate stats
    const statsByType: Record<string, {
      type: string;
      total: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      deliveryRate: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
      emails: Array<{
        id: string;
        recipient_email: string;
        subject: string;
        created_at: string;
        delivered_at: string | null;
        opened_at: string | null;
        clicked_at: string | null;
        bounced_at: string | null;
        bounce_reason: string | null;
      }>;
    }> = {};

    (emailLogs || []).forEach((log: any) => {
      // Use template_slug as the type, or fallback to email_type from metadata
      const type = log.metadata?.email_type || log.template_slug || "unknown";
      
      if (!statsByType[type]) {
        statsByType[type] = {
          type,
          total: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          emails: [],
        };
      }

      const stats = statsByType[type];
      stats.total++;
      
      // email_send_logs uses status field: 'sent' = delivered, 'bounced' = bounced
      if (log.status === "sent") stats.delivered++;
      if (log.opened_at) stats.opened++;
      if (log.clicked_at) stats.clicked++;
      if (log.status === "bounced") stats.bounced++;

      stats.emails.push({
        id: log.id,
        recipient_email: log.recipient || "Unknown",
        subject: log.subject || "No subject",
        created_at: log.created_at,
        delivered_at: log.status === "sent" ? (log.sent_at || log.created_at) : null,
        opened_at: log.opened_at,
        clicked_at: log.clicked_at,
        bounced_at: log.status === "bounced" ? (log.sent_at || log.created_at) : null,
        bounce_reason: log.error_message || null,
      });
    });

    // Calculate rates
    Object.values(statsByType).forEach((stats) => {
      stats.deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
      stats.openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
      stats.clickRate = stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0;
      stats.bounceRate = stats.total > 0 ? (stats.bounced / stats.total) * 100 : 0;
    });

    return NextResponse.json({
      stats: Object.values(statsByType),
      totalEmails: emailLogs?.length || 0,
    });
  } catch (error: any) {
    console.error("Error fetching email stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email stats" },
      { status: 500 }
    );
  }
}

