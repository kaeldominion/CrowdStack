import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendTemplateEmail } from "./template-renderer";
import { sendNotification } from "../notifications/send";

/**
 * Send feedback request email and in-app notification to an attendee
 * Uses centralized email system with automatic logging
 */
export async function sendFeedbackRequest(
  registrationId: string,
  eventId: string,
  userId: string,
  attendeeEmail: string
): Promise<{ success: boolean; error?: string; notificationId?: string }> {
  const supabase = createServiceRoleClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";

  try {
    // Get event and attendee details
    const { data: event } = await supabase
      .from("events")
      .select(`
        id,
        name,
        venue:venues(id, name),
        organizer:organizers(id, name)
      `)
      .eq("id", eventId)
      .single();

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const { data: attendee } = await supabase
      .from("attendees")
      .select("id, name, email")
      .eq("user_id", userId)
      .single();

    // Get or create feedback request record (should already exist from trigger)
    let { data: feedbackRequest } = await supabase
      .from("event_feedback_requests")
      .select("id, token, token_expires_at")
      .eq("registration_id", registrationId)
      .single();

    if (!feedbackRequest) {
      // Generate token if request doesn't exist
      const token = crypto.randomUUID();
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // 7 days

      const { data: newRequest, error: insertError } = await supabase
        .from("event_feedback_requests")
        .insert({
          registration_id: registrationId,
          event_id: eventId,
          user_id: userId,
          token,
          token_expires_at: tokenExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create feedback request: ${insertError.message}`);
      }

      feedbackRequest = newRequest;
    }

    // Build feedback link with secure token
    const feedbackLink = `${baseUrl}/feedback/${eventId}/${registrationId}?token=${feedbackRequest.token}`;

    // Get venue name
    const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
    const venueName = venue?.name || null;

    // Get attendee name
    const attendeeName = attendee?.name || null;

    // Send email using template system (automatically logged)
    // Format names for template (add space/prefix if needed)
    const formattedAttendeeName = attendeeName ? ` ${attendeeName}` : "";
    const formattedVenueName = venueName ? ` at ${venueName}` : "";
    
    const emailResult = await sendTemplateEmail(
      "feedback_request",
      attendeeEmail,
      userId,
      {
        event_name: event.name,
        venue_name: formattedVenueName,
        attendee_name: formattedAttendeeName,
        feedback_link: feedbackLink,
      },
      {
        event_id: eventId,
        registration_id: registrationId,
        user_id: userId,
        email_type: "feedback_request",
      }
    );

    if (!emailResult.success) {
      console.error("[Feedback Request] Failed to send email:", emailResult.error);
      // Continue anyway - try to send in-app notification
    }

    // Send in-app notification
    let notificationId: string | undefined;
    try {
      const { data: notification } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: "event_feedback_request",
          title: "How was your experience?",
          message: `Thanks for attending ${event.name}${venueName ? ` at ${venueName}` : ""}. We'd love to hear your feedback.`,
          link: `/feedback/${eventId}/${registrationId}?token=${feedbackRequest.token}`,
          metadata: {
            event_id: eventId,
            registration_id: registrationId,
            event_name: event.name,
            venue_name: venueName,
          },
        })
        .select("id")
        .single();

      notificationId = notification?.id;

      // Update feedback request with notification ID
      if (notificationId) {
        await supabase
          .from("event_feedback_requests")
          .update({ notification_id: notificationId })
          .eq("id", feedbackRequest.id);
      }
    } catch (notificationError) {
      console.error("[Feedback Request] Failed to send in-app notification:", notificationError);
      // Don't fail the whole operation if notification fails
    }

    return {
      success: true,
      notificationId,
    };
  } catch (error: any) {
    console.error("[Feedback Request] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to send feedback request",
    };
  }
}

/**
 * Process queued feedback requests (called by background job)
 * Sends feedback requests for all queued items that are past their delay time
 */
export async function processQueuedFeedbackRequests(): Promise<{
  processed: number;
  errors: number;
}> {
  const supabase = createServiceRoleClient();
  let processed = 0;
  let errors = 0;

  try {
    // Get all feedback requests that haven't been sent yet
    // (requests are created by trigger, but emails are sent by this function)
    // We'll identify them by checking if notification_id is NULL
    const { data: requests, error: fetchError } = await supabase
      .from("event_feedback_requests")
      .select(`
        id,
        registration_id,
        event_id,
        user_id,
        requested_at,
        registrations!inner(
          attendee_id,
          attendees!inner(
            id,
            email,
            user_id
          )
        )
      `)
      .is("notification_id", null)
      .limit(100); // Process in batches

    if (!requests || requests.length === 0) {
      return { processed: 0, errors: 0 };
    }

    // Process each request
    for (const request of requests) {
      try {
        const registration = Array.isArray(request.registrations)
          ? request.registrations[0]
          : request.registrations;
        const attendee = Array.isArray(registration?.attendees)
          ? registration.attendees[0]
          : registration?.attendees;

        if (!attendee?.email) {
          console.warn(
            `[Feedback Request] Skipping request ${request.id}: attendee missing email`
          );
          continue;
        }

        // Use user_id from request (already validated when request was created)
        const result = await sendFeedbackRequest(
          request.registration_id,
          request.event_id,
          request.user_id,
          attendee.email
        );

        if (result.success) {
          processed++;
        } else {
          errors++;
          console.error(`[Feedback Request] Failed for request ${request.id}:`, result.error);
        }
      } catch (error: any) {
        errors++;
        console.error(`[Feedback Request] Error processing request ${request.id}:`, error);
      }
    }

    return { processed, errors };
  } catch (error: any) {
    console.error("[Feedback Request] Error processing queue:", error);
    return { processed, errors: errors + 1 };
  }
}
