import "server-only";

import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "./template-renderer";

interface PhotosLiveEmailOptions {
  to: string;
  eventName: string;
  eventDate: string;
  venueName: string | null;
  galleryUrl: string;
  customMessage?: string;
}

/**
 * Send "Photos are live" notification email to an attendee
 * Uses the database-driven email template system
 * Returns the Postmark MessageID for tracking
 */
export async function sendPhotosLiveEmail(options: PhotosLiveEmailOptions): Promise<string> {
  const {
    to,
    eventName,
    eventDate,
    venueName,
    galleryUrl,
    customMessage = "",
  } = options;

  // Get recipient user ID if available
  const serviceSupabase = createServiceRoleClient();
  const { data: user } = await serviceSupabase
    .from("attendees")
    .select("id")
    .eq("email", to)
    .single();

  const recipientUserId = user?.id || null;

  // Use template system
  // Note: eventId should be passed from the caller in metadata
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
    },
    {} // Metadata will be set by sendPhotosNotificationBatch
  );

  if (!result.success || !result.messageId) {
    throw new Error(result.error || "Failed to send photos email");
  }

  return result.messageId;
}

interface BatchNotificationResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
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

