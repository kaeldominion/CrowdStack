import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendTemplateEmail } from "./template-renderer";
import { sendEmail } from "./postmark";

/**
 * Send venue approval request email
 * Uses the database-driven template system via Postmark
 */
export async function sendVenueApprovalRequestEmail(
  venueEmail: string,
  venueName: string,
  eventName: string,
  organizerName: string,
  approvalLink: string,
  eventId?: string,
  eventDate?: string
): Promise<{ success: boolean; error?: string }> {
  console.log("[Venue Notification] Sending approval request email", {
    to: venueEmail,
    eventName,
  });

  const result = await sendTemplateEmail(
    "venue_approval_request",
    venueEmail,
    null, // Venue users don't have a single user_id
    {
      venue_name: venueName,
      organizer_name: organizerName,
      event_name: eventName,
      event_date: eventDate || "TBD",
      approval_link: approvalLink,
    },
    {
      event_id: eventId || null,
      email_type: "venue_approval_request",
    }
  );

  if (!result.success) {
    console.error("[Venue Notification] Failed to send approval request:", result.error);
  }

  return result;
}

/**
 * Send event approval/rejection notification email to organizer
 * Uses the database-driven template system via Postmark
 */
export async function sendEventApprovalResultEmail(
  organizerEmail: string,
  organizerName: string,
  eventName: string,
  venueName: string,
  approved: boolean,
  rejectionReason?: string,
  eventId?: string,
  eventLink?: string
): Promise<{ success: boolean; error?: string }> {
  const templateSlug = approved ? "event_approved" : "event_rejected";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
  const defaultEventLink = eventId
    ? `${baseUrl}/app/organizer/events/${eventId}`
    : `${baseUrl}/app/organizer/events`;

  console.log("[Venue Notification] Sending approval result email", {
    to: organizerEmail,
    eventName,
    approved,
  });

  const result = await sendTemplateEmail(
    templateSlug,
    organizerEmail,
    null,
    {
      organizer_name: organizerName,
      venue_name: venueName,
      event_name: eventName,
      event_link: eventLink || defaultEventLink,
      rejection_reason: rejectionReason || "",
    },
    {
      event_id: eventId || null,
      email_type: templateSlug,
    }
  );

  if (!result.success) {
    console.error("[Venue Notification] Failed to send approval result:", result.error);
  }

  return result;
}

