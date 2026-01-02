import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

/**
 * POST /api/cron/dj-gig-reminders
 * Send reminder emails for upcoming DJ gigs
 * Should be called by a cron job (e.g., every hour)
 */
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
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  try {
    // Get confirmed gigs starting in ~24 hours (±1 hour window)
    const oneDayStart = new Date(oneDayFromNow.getTime() - 60 * 60 * 1000);
    const oneDayEnd = new Date(oneDayFromNow.getTime() + 60 * 60 * 1000);

    // First get all confirmed responses
    const { data: allConfirmedResponses } = await supabase
      .from("dj_gig_responses")
      .select(`
        id,
        dj_id,
        dj:djs(
          id,
          name,
          handle,
          user_id
        ),
        gig_posting_id,
        dj_gig_postings(
          id,
          title,
          event_id
        )
      `)
      .eq("status", "confirmed");

    // Then filter by event start time
    const gigs24h: any[] = [];
    const gigs4h: any[] = [];

    for (const response of allConfirmedResponses || []) {
      // Supabase returns relations as arrays, so we need to access the first element
      const gigPosting = Array.isArray(response.dj_gig_postings) 
        ? response.dj_gig_postings[0] 
        : response.dj_gig_postings;
      
      if (!gigPosting?.event_id) continue;

      // Get event details
      const { data: event } = await supabase
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          venues(name, address, city, state)
        `)
        .eq("id", gigPosting.event_id)
        .single();

      if (!event || !event.start_time) continue;

      const eventStartTime = new Date(event.start_time);
      const timeDiff = eventStartTime.getTime() - now.getTime();
      const hoursUntilEvent = timeDiff / (1000 * 60 * 60);

      // Check if within 24h window (23-25 hours)
      if (hoursUntilEvent >= 23 && hoursUntilEvent <= 25) {
        gigs24h.push({
          ...response,
          dj_gig_postings: gigPosting,
          event,
        });
      }

      // Check if within 4h window (3.5-4.5 hours)
      if (hoursUntilEvent >= 3.5 && hoursUntilEvent <= 4.5) {
        gigs4h.push({
          ...response,
          dj_gig_postings: gigPosting,
          event,
        });
      }
    }


    // TODO: Add tracking table to prevent duplicate reminders
    // For now, we'll send them - you might want to add a dj_gig_reminders_sent table

    const sent24h = [];
    const sent4h = [];

    // Send 24h reminders
    for (const response of gigs24h) {
      if (response.dj?.user_id) {
        try {
          const { data: user } = await supabase.auth.admin.getUserById(response.dj.user_id);
          if (user?.user?.email) {
            const event = response.event;
            const startTime = new Date(event?.start_time || "");

            await sendTemplateEmail(
              "dj_gig_reminder_24h",
              user.user.email,
              response.dj.user_id,
              {
                dj_name: response.dj.name || response.dj.handle,
                gig_title: response.dj_gig_postings?.title || "Gig",
                event_name: event?.name || "Event",
                event_date: startTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                event_time: startTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }),
                venue_name: event?.venues?.name || "Venue TBA",
                venue_address: event?.venues?.address
                  ? `${event.venues.address}${event.venues.city ? `, ${event.venues.city}` : ""}${event.venues.state ? `, ${event.venues.state}` : ""}`
                  : null,
                event_url: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/e/${event?.slug || event?.id}`,
              },
              { event_id: event?.id, gig_posting_id: response.dj_gig_postings?.id, dj_id: response.dj.id }
            );
            sent24h.push(response.id);
          }
        } catch (error) {
          console.error(`Failed to send 24h reminder for gig ${response.dj_gig_postings?.id}:`, error);
        }
      }
    }

    // Send 4h reminders
    for (const response of gigs4h) {
      if (response.dj?.user_id) {
        try {
          const { data: user } = await supabase.auth.admin.getUserById(response.dj.user_id);
          if (user?.user?.email) {
            const event = response.event;
            const startTime = new Date(event?.start_time || "");

            await sendTemplateEmail(
              "dj_gig_reminder_4h",
              user.user.email,
              response.dj.user_id,
              {
                dj_name: response.dj.name || response.dj.handle,
                gig_title: response.dj_gig_postings?.title || "Gig",
                event_name: event?.name || "Event",
                event_date: startTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                event_time: startTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }),
                venue_name: event?.venues?.name || "Venue TBA",
                venue_address: event?.venues?.address
                  ? `${event.venues.address}${event.venues.city ? `, ${event.venues.city}` : ""}${event.venues.state ? `, ${event.venues.state}` : ""}`
                  : null,
                event_url: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/e/${event?.slug || event?.id}`,
              },
              { event_id: event?.id, gig_posting_id: response.dj_gig_postings?.id, dj_id: response.dj.id }
            );
            sent4h.push(response.id);
          }
        } catch (error) {
          console.error(`Failed to send 4h reminder for gig ${response.dj_gig_postings?.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent_24h: sent24h.length,
      sent_4h: sent4h.length,
    });
  } catch (error: any) {
    console.error("Error sending DJ gig reminders:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminders" },
      { status: 500 }
    );
  }
}

