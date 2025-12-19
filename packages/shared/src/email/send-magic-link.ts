import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { logMessage } from "./log-message";

/**
 * Send a magic link email to an attendee using Supabase Auth
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  if (!redirectTo) {
    throw new Error("redirectTo parameter is required for sendMagicLink");
  }
  
  const redirectUrl = redirectTo;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      await logMessage(
        email,
        "Magic Link - Event Photos Published",
        "failed",
        error.message
      );
      throw error;
    }

    await logMessage(
      email,
      "Magic Link - Event Photos Published",
      "sent"
    );
  } catch (error: any) {
    await logMessage(
      email,
      "Magic Link - Event Photos Published",
      "failed",
      error?.message || "Unknown error"
    );
    throw error;
  }
}

