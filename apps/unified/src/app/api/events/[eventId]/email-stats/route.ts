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

    // Get all email logs for this event
    const { data: emailLogs, error } = await serviceSupabase
      .from("message_logs")
      .select("*")
      .eq("event_id", params.eventId)
      .not("email_message_type", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Group by email_message_type and calculate stats
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
      const type = log.email_message_type || "unknown";
      
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
      
      if (log.email_delivered_at) stats.delivered++;
      if (log.email_opened_at) stats.opened++;
      if (log.email_clicked_at) stats.clicked++;
      if (log.email_bounced_at) stats.bounced++;

      stats.emails.push({
        id: log.id,
        recipient_email: log.email_recipient_email || log.recipient_email || "Unknown",
        subject: log.email_subject || log.subject || "No subject",
        created_at: log.created_at,
        delivered_at: log.email_delivered_at,
        opened_at: log.email_opened_at,
        clicked_at: log.email_clicked_at,
        bounced_at: log.email_bounced_at,
        bounce_reason: log.email_bounce_reason,
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

