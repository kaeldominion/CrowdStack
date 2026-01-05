import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { sendPhotosNotificationBatch, sendPhotosLiveEmail } from "@crowdstack/shared/email/photo-notifications";

// Minimum time between manual notification emails
// Set to 1 hour to prevent accidental spam while allowing re-sends if needed
const DEBOUNCE_MINUTES = 60;

interface NotifyRequestBody {
  recipient_mode?: "registered" | "attended";
  custom_message?: string;
  send_test_to_me?: boolean;
}

/**
 * POST /api/events/[eventId]/photos/notify
 * Send "photos are live" notification emails to attendees
 * 
 * Allowed roles: superadmin, event_organizer (for their events), venue_admin (for their venue's events)
 */
export async function POST(
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

    const serviceSupabase = createServiceRoleClient();
    const isSuperadmin = await userHasRole("superadmin");

    // Get event with venue info
    const { data: event } = await serviceSupabase
      .from("events")
      .select(`
        id, 
        name, 
        slug, 
        start_time, 
        organizer_id,
        venue_id,
        venues(name)
      `)
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check permissions
    let hasAccess = isSuperadmin;

    // Check if user is the organizer creator
    if (!hasAccess) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", user.id)
        .eq("id", event.organizer_id)
        .single();

      if (organizer) {
        hasAccess = true;
      }
    }

    // Check if user is an organizer team member
    if (!hasAccess) {
      const { data: organizerUser } = await serviceSupabase
        .from("organizer_users")
        .select("id")
        .eq("organizer_id", event.organizer_id)
        .eq("user_id", user.id)
        .single();

      if (organizerUser) {
        hasAccess = true;
      }
    }

    // Check if user is a venue admin for this event's venue
    if (!hasAccess && event.venue_id) {
      // Check if user created the venue
      const { data: venueCreator } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("created_by", user.id)
        .eq("id", event.venue_id)
        .single();

      if (venueCreator) {
        hasAccess = true;
      }

      // Check if user is a venue team member
      if (!hasAccess) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("user_id", user.id)
          .single();

        if (venueUser) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get album and check if published
    const { data: album } = await serviceSupabase
      .from("photo_albums")
      .select("*")
      .eq("event_id", params.eventId)
      .single();

    if (!album) {
      return NextResponse.json({ error: "No photo album found for this event" }, { status: 404 });
    }

    if (album.status !== "published") {
      return NextResponse.json({ error: "Album must be published before sending notifications" }, { status: 400 });
    }

    // Parse request body
    const body: NotifyRequestBody = await request.json().catch(() => ({}));
    const recipientMode = body.recipient_mode || album.photo_email_recipient_mode || "registered";
    const customMessage = body.custom_message?.trim() || undefined;
    const sendTestToMe = body.send_test_to_me === true;

    // Check debounce (skip for test emails)
    if (!sendTestToMe && album.photo_last_notified_at) {
      const lastNotified = new Date(album.photo_last_notified_at);
      const now = new Date();
      const minutesSinceLastNotification = (now.getTime() - lastNotified.getTime()) / (1000 * 60);

      if (minutesSinceLastNotification < DEBOUNCE_MINUTES) {
        return NextResponse.json({
          error: `Please wait ${Math.ceil(DEBOUNCE_MINUTES - minutesSinceLastNotification)} more minutes before sending another notification`,
          last_notified_at: album.photo_last_notified_at,
        }, { status: 429 });
      }
    }

    // Prepare event details for email
    const webUrl = request.nextUrl.origin;
    const galleryUrl = `${webUrl}/p/${event.slug}`;
    const eventDate = new Date(event.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const venueName = (event.venues as any)?.name || null;

    // Get 3-6 thumbnail URLs for email preview
    const { data: photos } = await serviceSupabase
      .from("photos")
      .select("storage_path")
      .eq("album_id", album.id)
      .order("display_order", { ascending: true })
      .limit(6);

    const thumbnailUrls = (photos || []).map((p) => {
      // Use Supabase storage transformation for thumbnails
      const bucketUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/event-photos";
      return `${bucketUrl}/${p.storage_path}?width=200&quality=80`;
    });

    // Handle test email
    if (sendTestToMe) {
      const userEmail = user.email;
      if (!userEmail) {
        return NextResponse.json({ error: "No email address found for your account" }, { status: 400 });
      }

      await sendPhotosLiveEmail({
        to: userEmail,
        eventId: params.eventId,
        eventName: event.name,
        eventDate,
        venueName,
        galleryUrl,
        customMessage,
        thumbnailUrls,
      });

      return NextResponse.json({
        success: true,
        test_email: true,
        sent_to: userEmail,
        message: `Test email sent to ${userEmail}`,
      });
    }

    // Get recipients based on mode
    let recipients: Array<{ email: string; name?: string }> = [];

    if (recipientMode === "attended") {
      // Only attendees who checked in
      const { data: checkedIn } = await serviceSupabase
        .from("checkins")
        .select(`
          registration:registrations(
            attendee:attendees(email, name)
          )
        `)
        .eq("registration.event_id", params.eventId);

      recipients = (checkedIn || [])
        .map((c: any) => c.registration?.attendee)
        .filter((a: any) => a?.email)
        .map((a: any) => ({ email: a.email, name: a.name }));
    } else {
      // All registered attendees
      const { data: registrations } = await serviceSupabase
        .from("registrations")
        .select(`
          attendee:attendees(email, name)
        `)
        .eq("event_id", params.eventId);

      recipients = (registrations || [])
        .map((r: any) => r.attendee)
        .filter((a: any) => a?.email)
        .map((a: any) => ({ email: a.email, name: a.name }));
    }

    // Deduplicate by email
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.email.toLowerCase(), r])).values()
    );

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        sent: 0,
        failed: 0,
        message: "No recipients found with email addresses",
      });
    }

    // Send notifications in batches
    const result = await sendPhotosNotificationBatch(
      uniqueRecipients,
      {
        eventId: params.eventId,
        eventName: event.name,
        eventDate,
        venueName,
        galleryUrl,
        customMessage,
        thumbnailUrls,
      }
    );

    // Update last notified timestamp
    await serviceSupabase
      .from("photo_albums")
      .update({ photo_last_notified_at: new Date().toISOString() })
      .eq("id", album.id);

    // Log to message_logs for audit trail
    const logSubject = venueName 
      ? `Photos from ${event.name} @ ${venueName} are now available!`
      : `Photos from ${event.name} are now available!`;
    
    await serviceSupabase
      .from("message_logs")
      .insert({
        recipient: `${result.sent} attendees`,
        subject: logSubject,
        status: result.failed === 0 ? "sent" : "sent",
        sent_at: new Date().toISOString(),
        error_message: result.errors.length > 0 ? result.errors.slice(0, 5).join("; ") : null,
      });

    return NextResponse.json({
      success: true,
      ...result,
      recipient_mode: recipientMode,
      message: `Sent ${result.sent} emails${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
    });
  } catch (error: any) {
    console.error("Error sending photo notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[eventId]/photos/notify
 * Get notification status and settings
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

    const serviceSupabase = createServiceRoleClient();

    // Get album settings
    const { data: album } = await serviceSupabase
      .from("photo_albums")
      .select(`
        id,
        status,
        photo_email_recipient_mode,
        photo_auto_email_on_publish,
        photo_last_notified_at
      `)
      .eq("event_id", params.eventId)
      .single();

    if (!album) {
      return NextResponse.json({ error: "No photo album found" }, { status: 404 });
    }

    // Get recipient counts for display
    const { count: registeredCount } = await serviceSupabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", params.eventId);

    const { count: attendedCount } = await serviceSupabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("registration.event_id", params.eventId);

    return NextResponse.json({
      album: {
        id: album.id,
        status: album.status,
        recipient_mode: album.photo_email_recipient_mode || "registered",
        auto_email_on_publish: album.photo_auto_email_on_publish || false,
        last_notified_at: album.photo_last_notified_at,
      },
      recipient_counts: {
        registered: registeredCount || 0,
        attended: attendedCount || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get notification status" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[eventId]/photos/notify
 * Update notification settings
 */
export async function PATCH(
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

    const serviceSupabase = createServiceRoleClient();
    const isSuperadmin = await userHasRole("superadmin");

    // Get event to check permissions
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check permissions
    let hasAccess = isSuperadmin;

    // Check if user is the organizer creator
    if (!hasAccess) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", user.id)
        .eq("id", event.organizer_id)
        .single();

      if (organizer) hasAccess = true;
    }

    // Check if user is an organizer team member
    if (!hasAccess) {
      const { data: organizerUser } = await serviceSupabase
        .from("organizer_users")
        .select("id")
        .eq("organizer_id", event.organizer_id)
        .eq("user_id", user.id)
        .single();

      if (organizerUser) hasAccess = true;
    }

    // Check if user is a venue admin for this event's venue
    if (!hasAccess && event.venue_id) {
      // Check if user created the venue
      const { data: venueCreator } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("created_by", user.id)
        .eq("id", event.venue_id)
        .single();

      if (venueCreator) hasAccess = true;

      // Check if user is a venue team member
      if (!hasAccess) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("user_id", user.id)
          .single();

        if (venueUser) hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.recipient_mode !== undefined) {
      if (!["registered", "attended"].includes(body.recipient_mode)) {
        return NextResponse.json({ error: "Invalid recipient_mode" }, { status: 400 });
      }
      updates.photo_email_recipient_mode = body.recipient_mode;
    }

    if (body.auto_email_on_publish !== undefined) {
      updates.photo_auto_email_on_publish = Boolean(body.auto_email_on_publish);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const { data: album, error } = await serviceSupabase
      .from("photo_albums")
      .update(updates)
      .eq("event_id", params.eventId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      album: {
        id: album.id,
        recipient_mode: album.photo_email_recipient_mode,
        auto_email_on_publish: album.photo_auto_email_on_publish,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

