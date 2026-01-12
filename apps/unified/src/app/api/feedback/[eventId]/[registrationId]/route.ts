import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/feedback/[eventId]/[registrationId]
 * Get feedback form state and validate token
 * Returns event details and whether feedback has already been submitted
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; registrationId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Validate token and get feedback request
    const { data: feedbackRequest, error: requestError } = await supabase
      .from("event_feedback_requests")
      .select(`
        id,
        registration_id,
        event_id,
        user_id,
        token,
        token_expires_at,
        feedback_id
      `)
      .eq("registration_id", params.registrationId)
      .eq("event_id", params.eventId)
      .eq("token", token)
      .single();

    if (requestError || !feedbackRequest) {
      return NextResponse.json(
        { error: "Invalid or expired feedback link" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (new Date(feedbackRequest.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Feedback link has expired" },
        { status: 410 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        id,
        name,
        description,
        start_time,
        venue:venues(id, name)
      `)
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if feedback already submitted
    let existingFeedback = null;
    if (feedbackRequest.feedback_id) {
      const { data: feedback } = await supabase
        .from("event_feedback")
        .select("id, rating, feedback_type, submitted_at")
        .eq("id", feedbackRequest.feedback_id)
        .single();

      existingFeedback = feedback;
    }

    const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        start_time: event.start_time,
        venue: venue
          ? {
              id: venue.id,
              name: venue.name,
            }
          : null,
      },
      feedbackRequest: {
        id: feedbackRequest.id,
        token: feedbackRequest.token,
        expiresAt: feedbackRequest.token_expires_at,
      },
      feedback: existingFeedback
        ? {
            id: existingFeedback.id,
            rating: existingFeedback.rating,
            feedbackType: existingFeedback.feedback_type,
            submittedAt: existingFeedback.submitted_at,
          }
        : null,
      hasSubmitted: !!existingFeedback,
    });
  } catch (error: any) {
    console.error("[Feedback API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
