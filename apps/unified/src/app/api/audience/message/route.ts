import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { getUserVenueId, getUserOrganizerId, getUserPromoterId } from "@/lib/data/get-user-entity";
import { getVenueAttendees } from "@/lib/data/attendees-venue";
import { getOrganizerAttendees } from "@/lib/data/attendees-organizer";
import { getPromoterAttendees } from "@/lib/data/attendees-promoter";

interface MessageRequest {
  audience_type: "venue" | "organizer" | "promoter" | "event";
  audience_id: string;
  subject: string;
  body: string;
}

/**
 * POST /api/audience/message
 * Queue a message to a scoped audience
 * 
 * Validates:
 * - User has access to the specified audience
 * - Recipient count is calculated server-side
 * - Message is queued (not sent immediately)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: MessageRequest = await request.json();
    const { audience_type, audience_id, subject, body: messageBody } = body;

    // Validate required fields
    if (!audience_type || !audience_id || !subject || !messageBody) {
      return NextResponse.json(
        { error: "Missing required fields: audience_type, audience_id, subject, body" },
        { status: 400 }
      );
    }

    // Validate audience_type enum
    if (!["venue", "organizer", "promoter", "event"].includes(audience_type)) {
      return NextResponse.json(
        { error: "Invalid audience_type. Must be: venue, organizer, promoter, or event" },
        { status: 400 }
      );
    }

    // Validate user has access to this audience
    let hasAccess = false;
    let recipientCount = 0;

    if (audience_type === "venue") {
      const userVenueId = await getUserVenueId();
      if (userVenueId !== audience_id && !(await userHasRole("superadmin"))) {
        return NextResponse.json(
          { error: "You do not have access to this venue audience" },
          { status: 403 }
        );
      }
      hasAccess = true;
      // Count recipients
      const attendees = await getVenueAttendees(audience_id, {});
      recipientCount = attendees.length;
    } else if (audience_type === "organizer") {
      const userOrganizerId = await getUserOrganizerId();
      if (userOrganizerId !== audience_id && !(await userHasRole("superadmin"))) {
        return NextResponse.json(
          { error: "You do not have access to this organizer audience" },
          { status: 403 }
        );
      }
      hasAccess = true;
      // Count recipients
      const attendees = await getOrganizerAttendees(audience_id, {});
      recipientCount = attendees.length;
    } else if (audience_type === "promoter") {
      const userPromoterId = await getUserPromoterId();
      if (userPromoterId !== audience_id && !(await userHasRole("superadmin"))) {
        return NextResponse.json(
          { error: "You do not have access to this promoter audience" },
          { status: 403 }
        );
      }
      hasAccess = true;
      // Count recipients
      const attendees = await getPromoterAttendees(audience_id, {});
      recipientCount = attendees.length;
    } else if (audience_type === "event") {
      // For events, check if user is organizer or venue admin for the event
      const serviceSupabase = createServiceRoleClient();
      const { data: event } = await serviceSupabase
        .from("events")
        .select("organizer_id, venue_id")
        .eq("id", audience_id)
        .single();

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const userOrganizerId = await getUserOrganizerId();
      const userVenueId = await getUserVenueId();
      const isSuperadmin = await userHasRole("superadmin");

      if (
        !isSuperadmin &&
        event.organizer_id !== userOrganizerId &&
        event.venue_id !== userVenueId
      ) {
        return NextResponse.json(
          { error: "You do not have access to this event audience" },
          { status: 403 }
        );
      }

      hasAccess = true;
      // Count recipients from registrations
      const { count } = await serviceSupabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", audience_id);
      recipientCount = count || 0;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Queue the message
    const serviceSupabase = createServiceRoleClient();
    const { data: message, error: messageError } = await serviceSupabase
      .from("audience_messages")
      .insert({
        sender_id: user.id,
        audience_type,
        audience_id,
        subject,
        body: messageBody,
        recipient_count: recipientCount,
        status: "queued",
      })
      .select()
      .single();

    if (messageError) {
      console.error("Failed to queue message:", messageError);
      return NextResponse.json(
        { error: "Failed to queue message", details: messageError.message },
        { status: 500 }
      );
    }

    // Log to message_logs (for audit trail - one entry per message, not per recipient)
    // In the future, individual recipient logs will be created when messages are actually sent
    const { error: logError } = await serviceSupabase.from("message_logs").insert({
      recipient: `${audience_type}:${audience_id}`,
      subject: `[Queued] ${subject}`,
      status: "pending",
      // sent_at will be set when message is actually processed
    });

    if (logError) {
      // Don't fail the request if logging fails, but log the error
      console.error("Failed to log message:", logError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        audience_type,
        audience_id,
        recipient_count: recipientCount,
        status: "queued",
        created_at: message.created_at,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/audience/message:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audience/message
 * List messages sent by the current user
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

    const { searchParams } = new URL(request.url);
    const audience_type = searchParams.get("audience_type");
    const audience_id = searchParams.get("audience_id");

    let query = supabase
      .from("audience_messages")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (audience_type) {
      query = query.eq("audience_type", audience_type);
    }
    if (audience_id) {
      query = query.eq("audience_id", audience_id);
    }

    const { data: messages, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

