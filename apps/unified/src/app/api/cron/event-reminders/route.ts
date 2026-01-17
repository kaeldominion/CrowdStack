import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail, getEmailTemplate } from "@crowdstack/shared/email/template-renderer";

/**
 * POST /api/cron/event-reminders
 * Send reminder emails for upcoming events (6 hours before)
 * Should be called by a cron job (e.g., every hour)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

// Vercel cron jobs send GET requests
export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  // Verify cron secret or Vercel cron header
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");

  // Allow if called by Vercel cron job OR if CRON_SECRET matches
  const isVercelCron = vercelCronHeader === "1";
  const isValidSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !isValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  // Test mode parameters
  const { searchParams } = new URL(request.url);
  const testEventId = searchParams.get("event_id"); // Test specific event (bypasses time window)
  const dryRun = searchParams.get("dry_run") === "true"; // Don't actually send, just preview

  console.log("[EventReminders] Cron triggered at:", now.toISOString(), testEventId ? `(TEST MODE: event_id=${testEventId})` : "", dryRun ? "(DRY RUN)" : "");

  try {
    // Pre-check: Verify the email template exists and is enabled
    const template = await getEmailTemplate("event_reminder_6h");
    if (!template) {
      console.error("[EventReminders] Template 'event_reminder_6h' not found or disabled!");
      return NextResponse.json({
        success: false,
        error: "Email template not found or disabled",
      }, { status: 500 });
    }
    console.log("[EventReminders] Template found:", template.slug, "enabled:", template.enabled);

    let events;
    let eventsError;

    if (testEventId) {
      // TEST MODE: Fetch specific event regardless of time window
      console.log("[EventReminders] TEST MODE: Fetching specific event:", testEventId);
      const result = await supabase
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          timezone,
          venue_id,
          important_info,
          venues(name, address, city, state)
        `)
        .eq("id", testEventId);
      events = result.data;
      eventsError = result.error;
    } else {
      // NORMAL MODE: Get events starting in ~6 hours (±1 hour window)
      const sixHoursStart = new Date(sixHoursFromNow.getTime() - 60 * 60 * 1000);
      const sixHoursEnd = new Date(sixHoursFromNow.getTime() + 60 * 60 * 1000);

      console.log("[EventReminders] Looking for events between:", sixHoursStart.toISOString(), "and", sixHoursEnd.toISOString());

      const result = await supabase
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          timezone,
          venue_id,
          important_info,
          venues(name, address, city, state)
        `)
        .eq("status", "published")
        .gte("start_time", sixHoursStart.toISOString())
        .lte("start_time", sixHoursEnd.toISOString());
      events = result.data;
      eventsError = result.error;
    }

    if (eventsError) {
      console.error("[EventReminders] Error fetching events:", eventsError);
      throw eventsError;
    }

    if (!events || events.length === 0) {
      console.log("[EventReminders] No events found", testEventId ? `(event_id ${testEventId} not found)` : "in the 6-hour window");
      return NextResponse.json({
        success: true,
        sent: 0,
        message: testEventId ? `Event ${testEventId} not found` : "No events starting in 6 hours",
      });
    }

    console.log("[EventReminders] Found", events.length, "events:", events.map(e => ({ id: e.id, name: e.name, start_time: e.start_time })));

    // BATCH QUERY OPTIMIZATION: Fetch all data upfront instead of per-event/per-registration queries
    const eventIds = events.map((e) => e.id);

    // 1. Batch fetch ALL registrations for all events (1 query instead of N)
    const { data: allRegistrations, error: regsError } = await supabase
      .from("registrations")
      .select(`
        id,
        event_id,
        attendee:attendees(
          id,
          name,
          email,
          user_id
        )
      `)
      .in("event_id", eventIds);

    if (regsError) {
      console.error("[EventReminders] Error fetching registrations:", regsError);
      throw regsError;
    }

    if (!allRegistrations || allRegistrations.length === 0) {
      console.log("[EventReminders] No registrations found for events");
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No registrations for upcoming events",
      });
    }

    console.log("[EventReminders] Found", allRegistrations.length, "registrations across", events.length, "events");

    // 2. Batch fetch ALL existing reminders (1 query instead of N×M)
    const allRegIds = allRegistrations.map((r) => r.id);
    const { data: existingReminders } = await supabase
      .from("event_reminder_sent")
      .select("registration_id, event_id")
      .in("registration_id", allRegIds)
      .eq("reminder_type", "6h");

    // 3. Build lookup Set for O(1) "already sent" checks
    const alreadySentSet = new Set<string>();
    (existingReminders || []).forEach((r) => {
      alreadySentSet.add(`${r.event_id}:${r.registration_id}`);
    });

    // 4. Build registrations-by-event Map for O(1) lookup
    const regsByEvent = new Map<string, typeof allRegistrations>();
    allRegistrations.forEach((reg) => {
      const list = regsByEvent.get(reg.event_id) || [];
      list.push(reg);
      regsByEvent.set(reg.event_id, list);
    });

    // 5. Pre-compute event details (venue info, dates) for each event
    const eventDetailsMap = new Map<string, {
      venueName: string;
      venueAddress: string | null;
      venueAddressHtml: string;
      googleMapsUrl: string | null;
      eventDate: string;
      eventTime: string;
    }>();

    for (const event of events) {
      const venue = Array.isArray(event.venues) ? event.venues[0] : event.venues;
      const venueName = venue?.name || "Venue TBA";
      const venueAddress = venue?.address
        ? `${venue.address}${venue.city ? `, ${venue.city}` : ""}${venue.state ? `, ${venue.state}` : ""}`
        : null;
      const googleMapsUrl = venueAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
        : null;
      const venueAddressHtml = venueAddress
        ? `<p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Address:</strong> ${googleMapsUrl ? `<a href="${googleMapsUrl}" style="color: rgba(255,255,255,0.9); text-decoration: underline;">${venueAddress}</a>` : venueAddress}</p>`
        : "";
      const startTime = event.start_time ? new Date(event.start_time) : null;
      const eventTimezone = event.timezone || "America/New_York";
      const eventDate = startTime
        ? startTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: eventTimezone,
          })
        : "TBA";
      const eventTime = startTime
        ? startTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: eventTimezone,
          })
        : "TBA";

      eventDetailsMap.set(event.id, {
        venueName,
        venueAddress,
        venueAddressHtml,
        googleMapsUrl,
        eventDate,
        eventTime,
      });
    }

    // 6. Process events and send reminders (no DB queries in loops!)
    const sent: string[] = [];
    const remindersToInsert: Array<{ registration_id: string; event_id: string; reminder_type: string }> = [];

    for (const event of events) {
      const registrations = regsByEvent.get(event.id) || [];
      const details = eventDetailsMap.get(event.id)!;

      for (const registration of registrations) {
        // Skip if already sent (O(1) lookup instead of DB query)
        const reminderKey = `${event.id}:${registration.id}`;
        if (alreadySentSet.has(reminderKey)) {
          console.log(`Skipping reminder for registration ${registration.id} - already sent`);
          continue;
        }

        const attendee = Array.isArray(registration.attendee)
          ? registration.attendee[0]
          : registration.attendee;

        if (!attendee?.email) {
          console.log(`[EventReminders] Skipping registration ${registration.id} - no email`);
          continue;
        }

        try {
          if (dryRun) {
            // DRY RUN: Just log what would be sent
            console.log(`[EventReminders] DRY RUN: Would send to ${attendee.email} for event ${event.name}`);
            sent.push(registration.id);
          } else {
            // Actually send the email
            const emailResult = await sendTemplateEmail(
              "event_reminder_6h",
              attendee.email,
              attendee.user_id,
              {
                attendee_name: attendee.name || "there",
                event_name: event.name,
                event_date: details.eventDate,
                event_time: details.eventTime,
                venue_name: details.venueName,
                venue_address_html: details.venueAddressHtml,
                venue_address_text: details.venueAddress ? `Address: ${details.venueAddress}` : "",
                google_maps_url: details.googleMapsUrl || "",
                event_url: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/e/${event.slug}`,
                important_info_html: event.important_info
                  ? `<div style="background: rgba(251, 191, 36, 0.1); padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFC107;">
                      <h3 style="color: #FFC107; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">⚠️ Important Info</h3>
                      <p style="color: #E5E7EB; font-size: 14px; margin: 0; line-height: 1.5;">${event.important_info}</p>
                    </div>`
                  : "",
                important_info_text: event.important_info ? `Important: ${event.important_info}` : "",
              },
              { event_id: event.id, registration_id: registration.id, attendee_id: attendee.id }
            );

            // Only track as sent if email was actually successful
            if (emailResult.success) {
              console.log(`[EventReminders] Sent reminder to ${attendee.email} for event ${event.name}`);
              remindersToInsert.push({
                registration_id: registration.id,
                event_id: event.id,
                reminder_type: "6h",
              });
              sent.push(registration.id);
            } else {
              console.error(`[EventReminders] Failed to send to ${attendee.email}:`, emailResult.error);
            }
          }
        } catch (error) {
          console.error(`[EventReminders] Exception sending to ${attendee.email}:`, error);
        }
      }
    }

    // 7. Batch insert all reminder records (1 query instead of N×M)
    // Skip during dry run
    if (remindersToInsert.length > 0 && !dryRun) {
      const { error: insertError } = await supabase
        .from("event_reminder_sent")
        .insert(remindersToInsert);

      if (insertError) {
        console.error("[EventReminders] Error batch inserting reminder records:", insertError);
      } else {
        console.log("[EventReminders] Successfully recorded", remindersToInsert.length, "sent reminders");
      }
    }

    console.log("[EventReminders] Completed.", dryRun ? "(DRY RUN)" : "", "Sent:", sent.length, "emails for", events.length, "events");

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      test_event_id: testEventId || undefined,
      sent: sent.length,
      events_processed: events.length,
      events: events.map(e => ({ id: e.id, name: e.name, start_time: e.start_time })),
      registrations_found: allRegistrations.length,
      already_sent: existingReminders?.length || 0,
    });
  } catch (error: any) {
    console.error("Error sending event reminders:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminders" },
      { status: 500 }
    );
  }
}

