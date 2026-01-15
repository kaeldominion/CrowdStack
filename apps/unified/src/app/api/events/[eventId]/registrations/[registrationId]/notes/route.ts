import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/events/[eventId]/registrations/[registrationId]/notes
 * Update notes for an attendee (simplified: one note per attendee per org)
 *
 * Body: { notes: string, role: "venue" | "organizer" | "promoter" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  try {
    const { eventId, registrationId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Development-only fallback
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { notes, role } = await request.json();

    if (typeof notes !== "string") {
      return NextResponse.json({ error: "Notes must be a string" }, { status: 400 });
    }

    if (!role || !["venue", "organizer", "promoter"].includes(role)) {
      return NextResponse.json({ error: "Role must be venue, organizer, or promoter" }, { status: 400 });
    }

    // Get registration with attendee_id
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select("id, event_id, attendee_id")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.event_id !== eventId) {
      return NextResponse.json({ error: "Registration does not belong to this event" }, { status: 400 });
    }

    // Get event info to determine venue_id and organizer_id
    const { data: eventInfo } = await serviceSupabase
      .from("events")
      .select("venue_id, organizer_id")
      .eq("id", eventId)
      .single();

    if (!eventInfo) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Build the note record based on role
    const noteRecord: {
      attendee_id: string;
      note: string;
      updated_at: string;
      updated_by: string;
      venue_id?: string;
      organizer_id?: string;
      promoter_id?: string;
    } = {
      attendee_id: registration.attendee_id,
      note: notes,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    let conflictColumn: string;

    if (role === "venue") {
      if (!eventInfo.venue_id) {
        return NextResponse.json({ error: "Event has no venue" }, { status: 400 });
      }
      noteRecord.venue_id = eventInfo.venue_id;
      conflictColumn = "idx_attendee_notes_venue_unique";
    } else if (role === "organizer") {
      if (!eventInfo.organizer_id) {
        return NextResponse.json({ error: "Event has no organizer" }, { status: 400 });
      }
      noteRecord.organizer_id = eventInfo.organizer_id;
      conflictColumn = "idx_attendee_notes_organizer_unique";
    } else {
      // Promoter - find their promoter_id
      const { data: promoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!promoter) {
        return NextResponse.json({ error: "Promoter profile not found" }, { status: 400 });
      }
      noteRecord.promoter_id = promoter.id;
      conflictColumn = "idx_attendee_notes_promoter_unique";
    }

    // Upsert the note (insert or update on conflict)
    const { error: upsertError } = await serviceSupabase
      .from("attendee_notes")
      .upsert(noteRecord, {
        onConflict: conflictColumn,
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("[Notes API] Upsert error:", upsertError);
      return NextResponse.json({ error: "Failed to save notes" }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error("[Notes API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notes" },
      { status: 500 }
    );
  }
}
