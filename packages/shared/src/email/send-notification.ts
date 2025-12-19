import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { logMessage } from "./log-message";

interface EmailNotificationData {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send a notification email
 * 
 * NOTE: This currently uses Supabase Auth OTP as a workaround.
 * For production, integrate with Resend, SendGrid, or similar.
 * For now, we just log the email and rely on in-app notifications.
 */
export async function sendNotificationEmail(data: EmailNotificationData): Promise<void> {
  // TODO: Integrate with a proper email service like Resend
  // For now, just log that we would send an email
  console.log("[Email Notification]", {
    to: data.to,
    subject: data.subject,
    // Don't log body for privacy
  });

  await logMessage(
    data.to,
    data.subject,
    "pending",
    "Email notification queued (in-app notification sent instead)"
  );
}

/**
 * Send venue approval request email
 */
export async function sendVenueApprovalRequestEmail(
  venueEmail: string,
  venueName: string,
  eventName: string,
  organizerName: string,
  approvalLink: string
): Promise<void> {
  await sendNotificationEmail({
    to: venueEmail,
    subject: `[Action Required] Event Approval Request: ${eventName}`,
    htmlBody: `
      <h1>New Event Pending Your Approval</h1>
      <p>Hello ${venueName},</p>
      <p><strong>${organizerName}</strong> would like to host an event at your venue:</p>
      <p><strong>Event:</strong> ${eventName}</p>
      <p>Please review and approve or reject this event:</p>
      <a href="${approvalLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Review Event
      </a>
    `,
    textBody: `
      New Event Pending Your Approval
      
      Hello ${venueName},
      
      ${organizerName} would like to host an event at your venue:
      
      Event: ${eventName}
      
      Please review and approve or reject this event at: ${approvalLink}
    `,
  });
}

/**
 * Send event approval/rejection notification email to organizer
 */
export async function sendEventApprovalResultEmail(
  organizerEmail: string,
  organizerName: string,
  eventName: string,
  venueName: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const subject = approved
    ? `Good News! Your event "${eventName}" has been approved`
    : `Update: Your event "${eventName}" was not approved`;

  const htmlBody = approved
    ? `
      <h1>Event Approved!</h1>
      <p>Hello ${organizerName},</p>
      <p>Great news! <strong>${venueName}</strong> has approved your event:</p>
      <p><strong>Event:</strong> ${eventName}</p>
      <p>You can now publish your event and start promoting it.</p>
    `
    : `
      <h1>Event Not Approved</h1>
      <p>Hello ${organizerName},</p>
      <p>Unfortunately, <strong>${venueName}</strong> has not approved your event:</p>
      <p><strong>Event:</strong> ${eventName}</p>
      ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
      <p>You can edit your event and try a different venue, or contact the venue directly.</p>
    `;

  await sendNotificationEmail({
    to: organizerEmail,
    subject,
    htmlBody,
  });
}

