import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/feedback/submit
 * Submit feedback for an event
 * Validates token and creates feedback record
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      registrationId,
      eventId,
      token,
      rating,
      comment,
      categories,
      freeText,
    } = body;

    // Validate required fields
    if (!registrationId || !eventId || !token || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
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
      .eq("registration_id", registrationId)
      .eq("event_id", eventId)
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

    // Check if feedback already submitted
    if (feedbackRequest.feedback_id) {
      return NextResponse.json(
        { error: "Feedback already submitted" },
        { status: 409 }
      );
    }

    // Get registration and attendee details
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        event_id,
        attendees!inner(id, user_id)
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const attendee = Array.isArray(registration.attendees)
      ? registration.attendees[0]
      : registration.attendees;

    if (!attendee || attendee.user_id !== feedbackRequest.user_id) {
      return NextResponse.json(
        { error: "User mismatch" },
        { status: 403 }
      );
    }

    // Determine feedback type based on rating
    const feedbackType = rating >= 4 ? "positive" : "negative";

    // Validate categories for negative feedback
    if (feedbackType === "negative" && categories) {
      if (!Array.isArray(categories)) {
        return NextResponse.json(
          { error: "Categories must be an array" },
          { status: 400 }
        );
      }

      // Validate category codes exist
      const { data: validCategories } = await supabase
        .from("event_feedback_categories")
        .select("code")
        .in("code", categories);

      if (validCategories && validCategories.length !== categories.length) {
        return NextResponse.json(
          { error: "Invalid category codes" },
          { status: 400 }
        );
      }
    }

    // Create feedback record
    const { data: feedback, error: feedbackError } = await supabase
      .from("event_feedback")
      .insert({
        registration_id: registrationId,
        event_id: eventId,
        attendee_id: attendee.id,
        user_id: feedbackRequest.user_id,
        rating,
        comment: feedbackType === "positive" ? comment || null : null,
        categories:
          feedbackType === "negative" && categories
            ? JSON.stringify(categories)
            : JSON.stringify([]),
        free_text: freeText || null,
        feedback_type: feedbackType,
      })
      .select()
      .single();

    if (feedbackError || !feedback) {
      console.error("[Feedback Submit] Error creating feedback:", feedbackError);
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 }
      );
    }

    // Update feedback request with feedback_id
    const { error: updateError } = await supabase
      .from("event_feedback_requests")
      .update({ feedback_id: feedback.id })
      .eq("id", feedbackRequest.id);

    if (updateError) {
      console.error(
        "[Feedback Submit] Error updating feedback request:",
        updateError
      );
      // Don't fail - feedback was created successfully
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        feedbackType: feedback.feedback_type,
        submittedAt: feedback.submitted_at,
      },
    });
  } catch (error: any) {
    console.error("[Feedback Submit] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
