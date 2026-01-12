import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * PUT /api/venue/feedback/[feedbackId]/notes
 * Add or update internal notes on feedback
 * Venue admins only
 */
export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { feedbackId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();

    if (!venueId) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "notes must be a string" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify feedback belongs to venue's event
    const { data: feedback } = await serviceSupabase
      .from("event_feedback")
      .select(`
        id,
        event_id,
        events!inner(venue_id)
      `)
      .eq("id", params.feedbackId)
      .single();

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    const event = Array.isArray(feedback.events) 
      ? feedback.events[0] 
      : feedback.events;

    if (event.venue_id !== venueId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Update feedback notes
    const { data: updated, error } = await serviceSupabase
      .from("event_feedback")
      .update({ internal_notes: notes || null })
      .eq("id", params.feedbackId)
      .select()
      .single();

    if (error) {
      console.error("[Update Feedback Notes] Error:", error);
      return NextResponse.json(
        { error: "Failed to update notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: updated,
    });
  } catch (error: any) {
    console.error("[Update Feedback Notes] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
