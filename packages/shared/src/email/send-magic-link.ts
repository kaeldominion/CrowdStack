import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { logEmail } from "./log-email";

/**
 * Send a magic link email to an attendee using Supabase Auth
 * Logs to email_send_logs instead of message_logs
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string,
  subject?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createServiceRoleClient();

  if (!redirectTo) {
    throw new Error("redirectTo parameter is required for sendMagicLink");
  }
  
  const redirectUrl = redirectTo;

  // Get recipient user ID if available
  const { data: user } = await supabase
    .from("attendees")
    .select("id")
    .eq("email", email)
    .single();

  const recipientUserId = user?.id || null;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      await logEmail({
        recipient: email,
        recipientUserId,
        subject: subject || "Magic Link - Event Photos Published",
        emailType: "magic_link",
        status: "failed",
        errorMessage: error.message,
        metadata: {
          ...(metadata || {}),
          redirect_to: redirectUrl,
        },
      });
      throw error;
    }

    // Note: Supabase Auth sends the email, so we don't have a Postmark message ID
    // We log it as sent, but without Postmark tracking
    await logEmail({
      recipient: email,
      recipientUserId,
      subject: subject || "Magic Link - Event Photos Published",
      emailType: "magic_link",
      status: "sent",
      sentAt: new Date().toISOString(),
      metadata: {
        ...(metadata || {}),
        redirect_to: redirectUrl,
        sent_via: "supabase_auth",
      },
    });
  } catch (error: any) {
    // Only log if not already logged above
    if (error.message !== "redirectTo parameter is required for sendMagicLink") {
      await logEmail({
        recipient: email,
        recipientUserId,
        subject: subject || "Magic Link - Event Photos Published",
        emailType: "magic_link",
        status: "failed",
        errorMessage: error?.message || "Unknown error",
        metadata: {
          ...(metadata || {}),
          redirect_to: redirectUrl,
        },
      });
    }
    throw error;
  }
}

