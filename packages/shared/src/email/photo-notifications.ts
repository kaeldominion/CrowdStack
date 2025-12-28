import "server-only";

import { sendEmail } from "./postmark";

interface PhotosLiveEmailOptions {
  to: string;
  eventName: string;
  eventDate: string;
  venueName: string | null;
  galleryUrl: string;
  customMessage?: string;
  thumbnailUrls?: string[]; // 3-6 preview thumbnails
}

/**
 * Send "Photos are live" notification email to an attendee
 */
export async function sendPhotosLiveEmail(options: PhotosLiveEmailOptions): Promise<void> {
  const {
    to,
    eventName,
    eventDate,
    venueName,
    galleryUrl,
    customMessage,
    thumbnailUrls = [],
  } = options;

  const locationText = venueName ? ` at ${venueName}` : "";
  const subject = `Photos from ${eventName} are now available!`;

  // Generate thumbnail grid HTML (3-6 images in a row)
  const thumbnailsHtml = thumbnailUrls.length > 0
    ? `
      <div style="margin: 24px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${thumbnailUrls.slice(0, 6).map((url, i) => `
              <td style="width: ${100 / Math.min(thumbnailUrls.length, 6)}%; padding: 4px;">
                <img 
                  src="${url}" 
                  alt="Event photo ${i + 1}" 
                  style="width: 100%; height: auto; border-radius: 8px; display: block;"
                />
              </td>
            `).join("")}
          </tr>
        </table>
      </div>
    `
    : "";

  const customMessageHtml = customMessage
    ? `
      <div style="background: #1F2937; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
        <p style="color: #E5E7EB; margin: 0; font-style: italic;">"${customMessage}"</p>
      </div>
    `
    : "";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photos from ${eventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <img 
                src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" 
                alt="CrowdStack" 
                width="48" 
                height="48" 
                style="display: block; margin: 0 auto 16px auto;"
              />
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 700; margin: 0; line-height: 1.3;">
                Your photos are ready!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hey there! The photos from <strong style="color: #FFFFFF;">${eventName}</strong>${locationText} on ${eventDate} are now available for viewing.
              </p>
              
              ${customMessageHtml}
              
              ${thumbnailsHtml}
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 16px 0 24px 0;">
                Browse the full gallery, download your favorites, and share the memories!
              </p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a 
                      href="${galleryUrl}" 
                      style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;"
                    >
                      View Photos
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
                If the button doesn't work, copy and paste this link:<br/>
                <a href="${galleryUrl}" style="color: #8B5CF6; word-break: break-all;">${galleryUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                You're receiving this because you attended ${eventName}.<br/>
                Powered by <a href="https://crowdstack.app" style="color: #8B5CF6; text-decoration: none;">CrowdStack</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textBody = `
Your photos from ${eventName} are ready!

Hey there! The photos from ${eventName}${locationText} on ${eventDate} are now available for viewing.

${customMessage ? `Message from the organizer: "${customMessage}"\n` : ""}
Browse the full gallery, download your favorites, and share the memories!

View Photos: ${galleryUrl}

---
You're receiving this because you attended ${eventName}.
Powered by CrowdStack - https://crowdstack.app
  `.trim();

  await sendEmail({
    from: "notifications@crowdstack.app",
    to,
    subject,
    htmlBody,
    textBody,
    tag: "photos-live",
  });
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
 */
export async function sendPhotosNotificationBatch(
  recipients: Array<{ email: string; name?: string }>,
  eventDetails: {
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
        await sendPhotosLiveEmail({
          to: recipient.email,
          ...eventDetails,
        });
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

