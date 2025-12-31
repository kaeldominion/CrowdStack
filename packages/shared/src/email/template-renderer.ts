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
    // Get template
    const template = await getEmailTemplate(templateSlug);

    if (!template) {
      throw new Error(`Template "${templateSlug}" not found or disabled`);
    }

    // Render subject and body
    const subject = renderTemplate(template.subject, data);
    const htmlBody = renderTemplate(template.html_body, data);
    const textBody = template.text_body
      ? renderTemplate(template.text_body, data)
      : undefined;

    // Log email send attempt
    const { data: logEntry, error: logError } = await supabase
      .from("email_send_logs")
      .insert({
        template_id: template.id,
        template_slug: template.slug,
        recipient,
        recipient_user_id: recipientUserId,
        subject,
        status: "pending",
        metadata: metadata || {},
      })
      .select()
      .single();

    if (logError) {
      console.error("[Template Email] Failed to create log entry:", logError);
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
      });

      // Update log with success
      if (logEntry) {
        await supabase
          .from("email_send_logs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: {
              postmark_message_id: result.MessageID,
            },
          })
          .eq("id", logEntry.id);
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

