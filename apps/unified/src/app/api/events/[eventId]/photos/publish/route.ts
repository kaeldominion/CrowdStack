import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { sendMagicLink } from "@crowdstack/shared/email/send-magic-link";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";

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

    // Verify organizer role
    if (!(await userHasRole("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get event and verify organizer
    const { data: event } = await serviceSupabase
      .from("events")
      .select("*, organizer_id")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: organizer } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (!organizer || event.organizer_id !== organizer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Get all registrations for this event
    const { data: registrations } = await serviceSupabase
      .from("registrations")
      .select("attendee_id, attendees(email)")
      .eq("event_id", params.eventId);

    // Send magic links to all attendees
    const webUrl = request.nextUrl.origin;
    const promises = (registrations || [])
      .filter((r: any) => r.attendees?.email)
      .map((r: any) =>
        sendMagicLink(
          r.attendees.email,
          `${webUrl}/p/${event.slug}`
        ).catch((err) => {
          console.error(`Failed to send magic link to ${r.attendees.email}:`, err);
        })
      );

    await Promise.all(promises);

    // Emit outbox event
    await emitOutboxEvent("photos_published", {
      event_id: params.eventId,
      album_id: album.id,
    });

    return NextResponse.json({
      success: true,
      album,
      emails_sent: registrations?.filter((r: any) => r.attendees?.email).length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to publish photos" },
      { status: 500 }
    );
  }
}

