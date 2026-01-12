import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendEmail } from "./postmark";
import type { EmailTemplate } from "../types";

/**
 * Render template variables in a string
 * Replaces {{variable}} with values from data object
 */
function renderTemplate(
  template: string,
  data: Record<string, any>
): string {
  let rendered = template;

  // Replace {{variable}} with values
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const value = data[key] !== null && data[key] !== undefined ? String(data[key]) : "";
    rendered = rendered.replace(regex, value);
  });

  return rendered;
}

/**
 * Get email template by slug
 */
export async function getEmailTemplate(
  slug: string
): Promise<EmailTemplate | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("slug", slug)
    .eq("enabled", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as EmailTemplate;
}

/**
 * Render and send email using template
 */
export async function sendTemplateEmail(
  templateSlug: string,
  recipient: string,
  recipientUserId: string | null,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = createServiceRoleClient();

  try {
    console.log(`[Template Email] Starting send for template: ${templateSlug} to: ${recipient}`);
    
    // Get template
    const template = await getEmailTemplate(templateSlug);

    if (!template) {
      console.error(`[Template Email] Template "${templateSlug}" not found or disabled`);
      throw new Error(`Template "${templateSlug}" not found or disabled`);
    }
    
    console.log(`[Template Email] Found template: ${template.slug} (id: ${template.id}, enabled: ${template.enabled})`)

    // Render subject and body
    const subject = renderTemplate(template.subject, data);
    const htmlBody = renderTemplate(template.html_body, data);
    const textBody = template.text_body
      ? renderTemplate(template.text_body, data)
      : undefined;

    // Enhance metadata with organizer_id and venue_id if event_id is present
    let enhancedMetadata = { ...(metadata || {}) };
    if (metadata?.event_id) {
      // Fetch event to get organizer_id and venue_id
      const { data: event } = await supabase
        .from("events")
        .select("organizer_id, venue_id")
        .eq("id", metadata.event_id)
        .single();
      
      if (event) {
        enhancedMetadata = {
          ...enhancedMetadata,
          organizer_id: event.organizer_id || null,
          venue_id: event.venue_id || null,
        };
      }
    }

    // Log email send attempt
    let logEntry: any = null;
    const { data: insertedLog, error: logError } = await supabase
      .from("email_send_logs")
      .insert({
        template_id: template.id,
        template_slug: template.slug,
        recipient,
        recipient_user_id: recipientUserId,
        subject,
        email_type: "template",
        status: "pending",
        metadata: enhancedMetadata,
      })
      .select()
      .single();

    if (logError) {
      console.error("[Template Email] Failed to create log entry:", logError);
      // Don't fail the email send, but we'll try to create/update after sending
    } else {
      logEntry = insertedLog;
    }

    // Send email via Postmark
    try {
      const result = await sendEmail({
        from: "notifications@crowdstack.app",
        to: recipient,
        subject,
        htmlBody,
        textBody,
        tag: `template:${template.slug}`,
        skipLogging: true, // Template-renderer handles its own logging
      });

      // Ensure log entry exists - create or update
      if (logEntry) {
        // Update existing log entry
        const existingMetadata = (logEntry.metadata as Record<string, any>) || {};
        const updatedMetadata = {
          ...existingMetadata,
          ...enhancedMetadata, // Use enhanced metadata with organizer_id/venue_id
          postmark_message_id: result.MessageID,
        };
        
        const { error: updateError } = await supabase
          .from("email_send_logs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: updatedMetadata,
          })
          .eq("id", logEntry.id);

        if (updateError) {
          console.error("[Template Email] Failed to update log entry:", updateError);
        } else {
          console.log("[Template Email] Log entry updated successfully:", {
            logId: logEntry.id,
            eventId: metadata?.event_id,
            templateSlug: template.slug,
          });
        }
      } else {
        // Initial insert failed, try to create log entry now with Postmark message ID
        const finalMetadata = {
          ...enhancedMetadata, // Use enhanced metadata with organizer_id/venue_id
          postmark_message_id: result.MessageID,
        };
        
        const { data: insertedLog, error: insertError } = await supabase
          .from("email_send_logs")
          .insert({
            template_id: template.id,
            template_slug: template.slug,
            recipient,
            recipient_user_id: recipientUserId,
            subject,
            email_type: "template",
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: finalMetadata,
          })
          .select()
          .single();

        if (insertError) {
          // Log error but don't fail - email was sent successfully
          console.error("[Template Email] Failed to create log entry after send:", insertError);
        } else {
          console.log("[Template Email] Log entry created after send:", {
            logId: insertedLog?.id,
            eventId: metadata?.event_id,
            templateSlug: template.slug,
          });
        }
      }

      return {
        success: true,
        messageId: result.MessageID,
      };
    } catch (emailError: any) {
      // Update log with failure
      if (logEntry) {
        await supabase
          .from("email_send_logs")
          .update({
            status: "failed",
            error_message: emailError.message || "Failed to send email",
          })
          .eq("id", logEntry.id);
      } else {
        // Initial insert failed, try to create log entry now with error status
        const finalMetadata = enhancedMetadata || {};
        await supabase
          .from("email_send_logs")
          .insert({
            template_id: template.id,
            template_slug: template.slug,
            recipient,
            recipient_user_id: recipientUserId,
            subject,
            email_type: "template",
            status: "failed",
            error_message: emailError.message || "Failed to send email",
            metadata: finalMetadata,
          })
          .select()
          .single();
      }

      throw emailError;
    }
  } catch (error: any) {
    console.error(`[Template Email] Error sending ${templateSlug}:`, error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Update email send log with open/click tracking
 */
export async function updateEmailTracking(
  messageId: string,
  type: "opened" | "clicked"
): Promise<void> {
  const supabase = createServiceRoleClient();

  const field = type === "opened" ? "opened_at" : "clicked_at";

  await supabase
    .from("email_send_logs")
    .update({
      [field]: new Date().toISOString(),
    })
    .eq("metadata->>postmark_message_id", messageId);
}

