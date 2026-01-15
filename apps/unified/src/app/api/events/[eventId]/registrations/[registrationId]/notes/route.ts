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

    // Get user's name for the response
    const { data: userData } = await serviceSupabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const userName = userData?.full_name || "Unknown User";
    const now = new Date().toISOString();

    // Determine org ID and build query based on role
    let orgId: string;
    let orgColumn: "venue_id" | "organizer_id" | "promoter_id";

    if (role === "venue") {
      if (!eventInfo.venue_id) {
        return NextResponse.json({ error: "Event has no venue" }, { status: 400 });
      }
      orgId = eventInfo.venue_id;
      orgColumn = "venue_id";
    } else if (role === "organizer") {
      if (!eventInfo.organizer_id) {
        return NextResponse.json({ error: "Event has no organizer" }, { status: 400 });
      }
      orgId = eventInfo.organizer_id;
      orgColumn = "organizer_id";
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
      orgId = promoter.id;
      orgColumn = "promoter_id";
    }

    // Check if note already exists for this attendee+org combination
    const { data: existingNote } = await serviceSupabase
      .from("attendee_notes")
      .select("id")
      .eq("attendee_id", registration.attendee_id)
      .eq(orgColumn, orgId)
      .maybeSingle();

    let error;

    if (existingNote) {
      // Update existing note
      const { error: updateError } = await serviceSupabase
        .from("attendee_notes")
        .update({
          note: notes,
          updated_at: now,
          updated_by: userId,
        })
        .eq("id", existingNote.id);
      error = updateError;
    } else {
      // Insert new note
      const insertData: Record<string, string> = {
        attendee_id: registration.attendee_id,
        note: notes,
        updated_at: now,
        updated_by: userId,
        [orgColumn]: orgId,
      };

      const { error: insertError } = await serviceSupabase
        .from("attendee_notes")
        .insert(insertData);
      error = insertError;
    }

    if (error) {
      console.error("[Notes API] Save error:", error);
      return NextResponse.json({ error: "Failed to save notes" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notes,
      updated_by_name: userName,
      updated_at: now,
    });
  } catch (error: any) {
    console.error("[Notes API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notes" },
      { status: 500 }
    );
  }
}
