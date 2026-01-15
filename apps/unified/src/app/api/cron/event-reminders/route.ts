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

    const sent = [];

    // For each event, get all registrations and send reminders
    for (const event of events) {
      // Get all registrations for this event
      const { data: registrations } = await supabase
        .from("registrations")
        .select(`
          id,
          attendee:attendees(
            id,
            name,
            email,
            user_id
          )
        `)
        .eq("event_id", event.id);

      if (!registrations || registrations.length === 0) continue;

      // Get venue details
      const venue = Array.isArray(event.venues) ? event.venues[0] : event.venues;
      const venueName = venue?.name || "Venue TBA";
      const venueAddress = venue?.address
        ? `${venue.address}${venue.city ? `, ${venue.city}` : ""}${venue.state ? `, ${venue.state}` : ""}`
        : null;

      // Build Google Maps URL
      const googleMapsUrl = venueAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
        : null;

      // Build venue address HTML (only if address exists)
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

      // Send reminder to each registered attendee (skip if already sent)
      for (const registration of registrations) {
        const attendee = Array.isArray(registration.attendee)
          ? registration.attendee[0]
          : registration.attendee;

        if (!attendee?.email) continue;

        // Check if reminder was already sent for this registration
        const { data: existingReminder } = await supabase
          .from("event_reminder_sent")
          .select("id")
          .eq("registration_id", registration.id)
          .eq("event_id", event.id)
          .eq("reminder_type", "6h")
          .single();

        if (existingReminder) {
          console.log(`Skipping reminder for registration ${registration.id} - already sent`);
          continue;
        }

        try {
          await sendTemplateEmail(
            "event_reminder_6h",
            attendee.email,
            attendee.user_id,
            {
              attendee_name: attendee.name || "there",
              event_name: event.name,
              event_date: eventDate,
              event_time: eventTime,
              venue_name: venueName,
              venue_address_html: venueAddressHtml,
              venue_address_text: venueAddress ? `Address: ${venueAddress}` : "",
              google_maps_url: googleMapsUrl || "",
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

          // Record that reminder was sent
          await supabase
            .from("event_reminder_sent")
            .insert({
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

