import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * Process email logs and group by type with stats
 */
function processEmailLogs(emailLogs: any[]) {
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

  emailLogs.forEach((log: any) => {
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

  return Object.values(statsByType);
}

/**
 * GET /api/events/[eventId]/email-stats
 * Get email delivery statistics for an event
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get user roles to check permissions
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");
    const isOrganizer = roles.includes("event_organizer");
    const isVenueAdmin = roles.includes("venue_admin");

    // Verify user has organizer or venue admin role (or is superadmin)
    if (!isSuperadmin && !isOrganizer && !isVenueAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user can access this event
    if (!isSuperadmin) {
      const { data: event } = await serviceSupabase
        .from("events")
        .select("organizer_id, venue_id")
        .eq("id", params.eventId)
        .single();

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      let hasAccess = false;

      // Check if user is organizer (via junction table first, then created_by)
      if (isOrganizer) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", userId)
          .eq("organizer_id", event.organizer_id)
          .single();
        
        if (organizerUser) {
          hasAccess = true;
        } else {
          // Fallback to created_by
          const { data: organizer } = await serviceSupabase
            .from("organizers")
            .select("id")
            .eq("created_by", userId)
            .single();
          
          if (organizer && organizer.id === event.organizer_id) {
            hasAccess = true;
          }
        }
      }

      // Check if user is venue admin
      if (!hasAccess && isVenueAdmin && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId)
          .eq("venue_id", event.venue_id)
          .single();
        
        if (venueUser) {
          hasAccess = true;
        } else {
          // Fallback to created_by
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", userId)
            .single();
          
          if (venue && venue.id === event.venue_id) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get all email logs for this event from email_send_logs
    // Query by event_id in metadata JSONB field
    // Try multiple query approaches to handle different metadata storage formats
    let emailLogs: any[] | null = null;
    let queryError: any = null;

    // First, try the standard query with text extraction
    const { data: logs1, error: err1 } = await serviceSupabase
      .from("email_send_logs")
      .select("*")
      .eq("metadata->>event_id", params.eventId)
      .order("created_at", { ascending: false });

    if (!err1 && logs1 && logs1.length > 0) {
      emailLogs = logs1;
      console.log(`[Email Stats] Found ${logs1.length} logs with standard query for event ${params.eventId}`);
    } else {
      // Try alternative query using JSONB containment
      console.log(`[Email Stats] Standard query returned no results, trying alternative query for event ${params.eventId}`);
      const { data: logs2, error: err2 } = await serviceSupabase
        .from("email_send_logs")
        .select("*")
        .contains("metadata", { event_id: params.eventId })
        .order("created_at", { ascending: false });
      
      if (!err2 && logs2 && logs2.length > 0) {
        emailLogs = logs2;
        console.log(`[Email Stats] Found ${logs2.length} logs with alternative query`);
      } else {
        queryError = err2 || err1;
        console.log(`[Email Stats] No logs found for event ${params.eventId}`, { err1, err2 });
      }
    }

    if (queryError && !emailLogs) {
      throw queryError;
    }

    // Process email logs and calculate stats
    const stats = processEmailLogs(emailLogs || []);

    return NextResponse.json({
      stats,
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

