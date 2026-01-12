import "server-only";

import { createServiceRoleClient } from "../supabase/server";

export type EmailType = "template" | "contact_form" | "magic_link" | "direct" | "system";

export interface LogEmailOptions {
  recipient: string;
  recipientUserId?: string | null;
  subject: string;
  emailType: EmailType;
  templateId?: string | null;
  templateSlug?: string | null;
  postmarkMessageId?: string | null;
  status?: "pending" | "sent" | "failed" | "bounced";
  sentAt?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Unified email logging function
 * Logs ALL emails to email_send_logs table
 * 
 * For template emails: preserves template_id and template_slug relationship
 * For non-template emails: sets template_id = NULL, uses template_slug = email_type
 */
export async function logEmail(options: LogEmailOptions): Promise<void> {
  const supabase = createServiceRoleClient();

  // Determine template_slug based on email type
  // For template emails, use provided template_slug
  // For non-template emails, use email_type as pseudo-slug
  const templateSlug = options.templateSlug || options.emailType;

  // Build metadata object
  const metadata: Record<string, any> = {
    ...(options.metadata || {}),
  };

  // Add Postmark message ID to metadata if provided
  if (options.postmarkMessageId) {
    metadata.postmark_message_id = options.postmarkMessageId;
  }

  // Add source tracking
  if (!metadata.source) {
    metadata.source = options.emailType;
  }

  const { error } = await supabase.from("email_send_logs").insert({
    template_id: options.templateId || null,
    template_slug: templateSlug,
    recipient: options.recipient,
    recipient_user_id: options.recipientUserId || null,
    subject: options.subject,
    email_type: options.emailType,
    status: options.status || "pending",
    sent_at: options.sentAt || (options.status === "sent" ? new Date().toISOString() : null),
    error_message: options.errorMessage || null,
    metadata,
  });

  if (error) {
    // Don't throw - logging failures shouldn't break the email flow
    console.error("[Email Log] Failed to log email:", error);
  } else {
    console.log("[Email Log] Email logged successfully:", {
      recipient: options.recipient,
      emailType: options.emailType,
      templateSlug,
      postmarkMessageId: options.postmarkMessageId,
    });
  }
}
