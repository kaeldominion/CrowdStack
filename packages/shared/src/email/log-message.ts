import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import type { MessageStatus } from "../types";

/**
 * Log an email message to the message_logs table
 */
export async function logMessage(
  recipient: string,
  subject: string,
  status: MessageStatus,
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("message_logs").insert({
    recipient,
    subject,
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    error_message: errorMessage || null,
  });

  if (error) {
    // Don't throw - logging failures shouldn't break the flow
    console.error("Failed to log message:", error);
  }
}

