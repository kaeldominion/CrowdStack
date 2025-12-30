import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { sendPhotosNotificationBatch } from "@crowdstack/shared/email/photo-notifications";
import { trackPhotoPublished } from "@/lib/analytics/server";

// Minimum hours between automatic notification emails on publish
// This prevents abuse via rapid publish/unpublish cycles
const AUTO_NOTIFY_COOLDOWN_HOURS = 24;

/**
 * POST /api/events/[eventId]/photos/publish
 * Publish the photo album and optionally send notification emails
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

    // Check if user is an organizer of this event
    if (!hasAccess && (await userHasRole("event_organizer"))) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (organizer && event.organizer_id === organizer.id) {
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

    // Get current album to check settings
    const { data: currentAlbum } = await serviceSupabase
      .from("photo_albums")
      .select("*")
      .eq("event_id", params.eventId)
      .single();

    if (!currentAlbum) {
      return NextResponse.json({ error: "No photo album found" }, { status: 404 });
    }

    // Update album to published
    const { data: album, error: albumError } = await serviceSupabase
      .from("photo_albums")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("event_id", params.eventId)
      .select()
      .single();

    if (albumError) {
      throw albumError;
    }

    // Emit outbox event
    await emitOutboxEvent("photos_published", {
      event_id: params.eventId,
      album_id: album.id,
    });

    // Track analytics event
    try {
      // Get photo count
      const { count: photoCount } = await serviceSupabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("album_id", album.id);
      
      await trackPhotoPublished(params.eventId, photoCount || 0, request);
    } catch (analyticsError) {
      console.warn("[Photo Publish API] Failed to track analytics event:", analyticsError);
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    let emailsSkipped = false;
    let skipReason = "";

    // Check if auto-email is enabled
    if (currentAlbum.photo_auto_email_on_publish) {
      // Check cooldown to prevent abuse via publish/unpublish cycling
      if (currentAlbum.photo_last_notified_at) {
        const lastNotified = new Date(currentAlbum.photo_last_notified_at);
        const now = new Date();
        const hoursSinceLastNotification = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastNotification < AUTO_NOTIFY_COOLDOWN_HOURS) {
          const hoursRemaining = Math.ceil(AUTO_NOTIFY_COOLDOWN_HOURS - hoursSinceLastNotification);
          emailsSkipped = true;
          skipReason = `Notification emails were sent ${Math.floor(hoursSinceLastNotification)} hours ago. ` +
            `Next auto-notification available in ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}. ` +
            `You can still send a manual notification from the Photos page if needed.`;
        }
      }

    if (!emailsSkipped) {
      // Get recipients based on mode
      const recipientMode = currentAlbum.photo_email_recipient_mode || "registered";
      let recipients: Array<{ email: string; name?: string }> = [];

      if (recipientMode === "attended") {
        // Only attendees who checked in
        const { data: checkedIn } = await serviceSupabase
          .from("checkins")
          .select(`
            registration:registrations(
              event_id,
              attendee:attendees(email, name)
            )
          `)
          .not("registration", "is", null);

        recipients = (checkedIn || [])
          .filter((c: any) => c.registration?.event_id === params.eventId)
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

      if (uniqueRecipients.length > 0) {
        // Prepare email details
        const webUrl = request.nextUrl.origin;
        const galleryUrl = `${webUrl}/p/${event.slug}`;
        const eventDate = new Date(event.start_time).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const venueName = (event.venues as any)?.name || null;

        // Get thumbnails for email preview
        const { data: photos } = await serviceSupabase
          .from("photos")
          .select("storage_path")
          .eq("album_id", album.id)
          .order("display_order", { ascending: true })
          .limit(6);

        const thumbnailUrls = (photos || []).map((p) => {
          const bucketUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/event-photos";
          return `${bucketUrl}/${p.storage_path}?width=200&quality=80`;
        });

        // Send notification emails
        const result = await sendPhotosNotificationBatch(
          uniqueRecipients,
          {
            eventId: params.eventId,
            eventName: event.name,
            eventDate,
            venueName,
            galleryUrl,
            thumbnailUrls,
          }
        );

        emailsSent = result.sent;
        emailsFailed = result.failed;

        // Update last notified timestamp
        await serviceSupabase
          .from("photo_albums")
          .update({ photo_last_notified_at: new Date().toISOString() })
          .eq("id", album.id);
      }
    } // end if (!emailsSkipped)
    } // end if (photo_auto_email_on_publish)

    return NextResponse.json({
      success: true,
      album,
      auto_email_enabled: currentAlbum.photo_auto_email_on_publish,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      emails_skipped: emailsSkipped,
      skip_reason: skipReason || undefined,
    });
  } catch (error: any) {
    console.error("Error publishing photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish photos" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/photos/publish
 * Unpublish the photo album (revert to draft)
 */
export async function DELETE(
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

    // Get event
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, venue_id")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check permissions
    let hasAccess = isSuperadmin;

    // Check if user is an organizer of this event
    if (!hasAccess && (await userHasRole("event_organizer"))) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (organizer && event.organizer_id === organizer.id) {
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

    // Update album to draft
    const { data: album, error: albumError } = await serviceSupabase
      .from("photo_albums")
      .update({
        status: "draft",
        published_at: null,
      })
      .eq("event_id", params.eventId)
      .select()
      .single();

    if (albumError) {
      throw albumError;
    }

    return NextResponse.json({
      success: true,
      album,
      message: "Album unpublished successfully",
    });
  } catch (error: any) {
    console.error("Error unpublishing photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unpublish photos" },
      { status: 500 }
    );
  }
}
