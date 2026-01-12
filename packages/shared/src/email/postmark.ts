import "server-only";

import { logEmail } from "./log-email";

interface PostmarkEmailOptions {
  from: string;
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
  tag?: string;
  messageStream?: string;
  // Optional logging metadata
  recipientUserId?: string | null;
  emailType?: "direct" | "system" | "contact_form" | "magic_link" | "template";
  metadata?: Record<string, any>;
  // Skip logging if already logged elsewhere (e.g., by template-renderer)
  skipLogging?: boolean;
}

interface PostmarkResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

/**
 * Send an email using Postmark HTTP API
 * Automatically logs to email_send_logs
 * 
 * @see https://postmarkapp.com/developer/api/email-api
 */
export async function sendEmail(options: PostmarkEmailOptions): Promise<PostmarkResponse> {
  const apiToken = process.env.POSTMARK_API_TOKEN;
  
  if (!apiToken) {
    throw new Error("POSTMARK_API_TOKEN environment variable is not set");
  }

  const payload = {
    From: options.from,
    To: options.to,
    Subject: options.subject,
    HtmlBody: options.htmlBody,
    TextBody: options.textBody,
    ReplyTo: options.replyTo,
    Tag: options.tag,
    MessageStream: options.messageStream || "outbound",
  };

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": apiToken,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.ErrorCode !== 0) {
      console.error("[Postmark] Email send failed:", result);
      
      // Log failed email (unless logging is skipped)
      if (!options.skipLogging) {
        await logEmail({
          recipient: options.to,
          recipientUserId: options.recipientUserId || null,
          subject: options.subject,
          emailType: options.emailType || "direct",
          postmarkMessageId: result.MessageID || null,
          status: "failed",
          errorMessage: result.Message || "Failed to send email",
          metadata: {
            ...(options.metadata || {}),
            tag: options.tag,
            from: options.from,
          },
        });
      }
      
      throw new Error(result.Message || "Failed to send email");
    }

    console.log("[Postmark] Email sent successfully:", {
      to: options.to,
      subject: options.subject,
      messageId: result.MessageID,
    });

    // Log successful email (unless logging is skipped)
    if (!options.skipLogging) {
      await logEmail({
        recipient: options.to,
        recipientUserId: options.recipientUserId || null,
        subject: options.subject,
        emailType: options.emailType || "direct",
        postmarkMessageId: result.MessageID,
        status: "sent",
        sentAt: result.SubmittedAt || new Date().toISOString(),
        metadata: {
          ...(options.metadata || {}),
          tag: options.tag,
          from: options.from,
          submitted_at: result.SubmittedAt,
        },
      });
    }

    return result;
  } catch (error: any) {
    // Log error if not already logged (and logging is not skipped)
    if (!options.skipLogging && error.message !== "Failed to send email") {
      await logEmail({
        recipient: options.to,
        recipientUserId: options.recipientUserId || null,
        subject: options.subject,
        emailType: options.emailType || "direct",
        status: "failed",
        errorMessage: error.message || "Unknown error",
        metadata: {
          ...(options.metadata || {}),
          tag: options.tag,
          from: options.from,
        },
      });
    }
    throw error;
  }
}

/**
 * Send a contact form / demo request notification to the sales team
 */
export async function sendContactFormEmail(data: {
  name: string;
  email: string;
  phone?: string;
  venueName?: string;
  interestType: "venue" | "organizer" | "other";
  message: string;
}): Promise<void> {
  const interestLabels = {
    venue: "Venue Owner/Manager",
    organizer: "Event Organizer",
    other: "Other",
  };

  const subject = `[Demo Request] ${data.name} - ${interestLabels[data.interestType]}`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1F2937; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">
        New Demo Request
      </h1>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; width: 140px;">Name:</td>
          <td style="padding: 8px 0; color: #1F2937; font-weight: 500;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Email:</td>
          <td style="padding: 8px 0; color: #1F2937;">
            <a href="mailto:${data.email}" style="color: #3B82F6;">${data.email}</a>
          </td>
        </tr>
        ${data.phone ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Phone:</td>
          <td style="padding: 8px 0; color: #1F2937;">
            <a href="tel:${data.phone}" style="color: #3B82F6;">${data.phone}</a>
          </td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Interest Type:</td>
          <td style="padding: 8px 0; color: #1F2937;">${interestLabels[data.interestType]}</td>
        </tr>
        ${data.venueName ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Venue Name:</td>
          <td style="padding: 8px 0; color: #1F2937;">${data.venueName}</td>
        </tr>
        ` : ""}
      </table>
      
      <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="color: #1F2937; margin: 0 0 10px 0; font-size: 14px;">Message:</h3>
        <p style="color: #374151; margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
          This email was sent from the CrowdStack contact form.
        </p>
      </div>
    </div>
  `;

  const textBody = `
New Demo Request

Name: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ""}
Interest Type: ${interestLabels[data.interestType]}
${data.venueName ? `Venue Name: ${data.venueName}` : ""}

Message:
${data.message}

---
This email was sent from the CrowdStack contact form.
  `.trim();

  await sendEmail({
    from: "notifications@crowdstack.app",
    to: "sales@crowdstack.app",
    replyTo: data.email,
    subject,
    htmlBody,
    textBody,
    tag: "contact-form",
    emailType: "contact_form",
    metadata: {
      contact_name: data.name,
      contact_email: data.email,
      contact_phone: data.phone || null,
      interest_type: data.interestType,
      venue_name: data.venueName || null,
    },
  });
}

