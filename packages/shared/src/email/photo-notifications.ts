import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendTemplateEmail } from "./template-renderer";

interface PhotosLiveEmailOptions {
  to: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  venueName: string | null;
  galleryUrl: string;
  customMessage?: string;
  thumbnailUrls?: string[];
}

interface BatchNotificationResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Generate HTML for photo thumbnails grid
 */
function generateThumbnailsHTML(thumbnailUrls: string[] | undefined, galleryUrl: string): string {
  if (!thumbnailUrls || thumbnailUrls.length === 0) {
    return "";
  }

  // Limit to 6 thumbnails for email
  const thumbnails = thumbnailUrls.slice(0, 6);
  const cols = thumbnails.length <= 3 ? thumbnails.length : 3;
  const cellWidth = Math.floor(100 / cols);

  let html = '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">';
  html += '<tr>';

  thumbnails.forEach((url, index) => {
    if (index > 0 && index % cols === 0) {
      html += '</tr><tr>';
    }
    html += `
      <td align="center" style="padding: 4px; width: ${cellWidth}%;">
        <a href="${galleryUrl}" style="display: block; text-decoration: none;">
          <img 
            src="${url}" 
            alt="Photo ${index + 1}" 
            width="100%" 
            style="max-width: 180px; height: auto; border-radius: 8px; display: block; margin: 0 auto;"
          />
        </a>
      </td>
    `;
  });

  // Fill remaining cells if needed
  const remaining = cols - (thumbnails.length % cols);
  if (remaining < cols && thumbnails.length > 0) {
    for (let i = 0; i < remaining; i++) {
      html += '<td style="width: ' + cellWidth + '%;"></td>';
    }
  }

  html += '</tr></table>';

  return html;
}

/**
 * Send "Photos are live" notification email to an attendee
 * Uses the database-driven email template system
 * Returns the Postmark MessageID for tracking
 */
export async function sendPhotosLiveEmail(options: PhotosLiveEmailOptions): Promise<string> {
  const {
    to,
    eventId,
    eventName,
    eventDate,
    venueName,
    galleryUrl,
    customMessage = "",
    thumbnailUrls,
  } = options;

  // Get recipient user ID if available
  const serviceSupabase = createServiceRoleClient();
  const { data: user } = await serviceSupabase
    .from("attendees")
    .select("id")
    .eq("email", to)
    .single();

  const recipientUserId = user?.id || null;

  // Generate thumbnail HTML
  const thumbnailsHTML = generateThumbnailsHTML(thumbnailUrls, galleryUrl);

  // Use template system with event_id for tracking
  const result = await sendTemplateEmail(
    "photos_published",
    to,
    recipientUserId,
    {
      event_name: eventName,
      event_date: eventDate,
      venue_name: venueName || "",
      gallery_url: galleryUrl,
      custom_message: customMessage || "",
      photo_thumbnails_html: thumbnailsHTML,
    },
    {
      event_id: eventId,
      email_type: "photos_published",
    }
  );

  if (!result.success || !result.messageId) {
    throw new Error(result.error || "Failed to send photos email");
  }

  return result.messageId;
}

/**
 * Send photos notification emails in batches
 * Handles rate limiting and error collection
 * Email logging is handled automatically by the template system
 */
export async function sendPhotosNotificationBatch(
  recipients: Array<{ email: string; name?: string }>,
  eventDetails: {
    eventId: string;
    eventName: string;
    eventDate: string;
    venueName: string | null;
    galleryUrl: string;
    customMessage?: string;
    thumbnailUrls?: string[];
  },
  batchSize: number = 50
): Promise<BatchNotificationResult> {
  const result: BatchNotificationResult = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Generate thumbnail HTML once for all recipients
  const thumbnailsHTML = generateThumbnailsHTML(eventDetails.thumbnailUrls, eventDetails.galleryUrl);

  // Process in batches to avoid overwhelming the email service
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const promises = batch.map(async (recipient) => {
      try {
        // Get recipient user ID for metadata
        const serviceSupabase = createServiceRoleClient();
        const { data: user } = await serviceSupabase
          .from("attendees")
          .select("id")
          .eq("email", recipient.email)
          .single();

        // Send email using template system with event_id in metadata
        const { sendTemplateEmail } = await import("./template-renderer");
        await sendTemplateEmail(
          "photos_published",
          recipient.email,
          user?.id || null,
          {
            event_name: eventDetails.eventName,
            event_date: eventDetails.eventDate,
            venue_name: eventDetails.venueName || "",
            gallery_url: eventDetails.galleryUrl,
            custom_message: eventDetails.customMessage || "",
            photo_thumbnails_html: thumbnailsHTML,
          },
          {
            event_id: eventDetails.eventId,
            email_type: "photos_published",
          }
        );

        result.sent++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`${recipient.email}: ${error.message || "Unknown error"}`);
        console.error(`Failed to send photo notification to ${recipient.email}:`, error);
      }
    });

    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return result;
}

