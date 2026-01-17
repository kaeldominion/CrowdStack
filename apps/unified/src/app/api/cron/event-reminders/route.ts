import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

/**
 * POST /api/cron/event-reminders
 * Send reminder emails for upcoming events (6 hours before)
 * Should be called by a cron job (e.g., every hour)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
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

  try {
    // Get events starting in ~6 hours (±1 hour window)
    const sixHoursStart = new Date(sixHoursFromNow.getTime() - 60 * 60 * 1000);
    const sixHoursEnd = new Date(sixHoursFromNow.getTime() + 60 * 60 * 1000);

    // Get all published events starting in the 6-hour window
    const { data: events } = await supabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        venue_id,
        important_info,
        venues(name, address, city, state)
      `)
      .eq("status", "published")
      .gte("start_time", sixHoursStart.toISOString())
      .lte("start_time", sixHoursEnd.toISOString());

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No events starting in 6 hours",
      });
    }

    // BATCH QUERY OPTIMIZATION: Fetch all data upfront instead of per-event/per-registration queries
    const eventIds = events.map((e) => e.id);

    // 1. Batch fetch ALL registrations for all events (1 query instead of N)
    const { data: allRegistrations } = await supabase
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

    if (!allRegistrations || allRegistrations.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No registrations for upcoming events",
      });
    }

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
      const eventDate = startTime
        ? startTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBA";
      const eventTime = startTime
        ? startTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
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

        if (!attendee?.email) continue;

        try {
          await sendTemplateEmail(
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

          // Collect for batch insert (instead of inserting per registration)
          remindersToInsert.push({
            registration_id: registration.id,
            event_id: event.id,
            reminder_type: "6h",
          });

          sent.push(registration.id);
        } catch (error) {
          console.error(`Failed to send reminder for registration ${registration.id}:`, error);
        }
      }
    }

    // 7. Batch insert all reminder records (1 query instead of N×M)
    if (remindersToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("event_reminder_sent")
        .insert(remindersToInsert);

      if (insertError) {
        console.error("Error batch inserting reminder records:", insertError);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      events_processed: events.length,
    });
  } catch (error: any) {
    console.error("Error sending event reminders:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminders" },
      { status: 500 }
    );
  }
}

