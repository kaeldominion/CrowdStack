import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendTemplateEmail } from "./template-renderer";

type NotificationType = "80_percent" | "100_percent";

/**
 * Check if a bonus notification has already been sent (using database)
 */
async function hasNotificationBeenSent(
  promoterId: string,
  eventId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("bonus_notifications_sent")
    .select("id")
    .eq("promoter_id", promoterId)
    .eq("event_id", eventId)
    .eq("notification_type", notificationType)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (which is expected if not sent)
    console.error("[Bonus Notification] Error checking notification status:", error);
  }

  return !!data;
}

/**
 * Mark a bonus notification as sent (persists to database)
 */
async function markNotificationSent(
  promoterId: string,
  eventId: string,
  notificationType: NotificationType
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("bonus_notifications_sent").insert({
    promoter_id: promoterId,
    event_id: eventId,
    notification_type: notificationType,
  });

  if (error && error.code !== "23505") {
    // 23505 = duplicate key (already exists, which is fine)
    console.error("[Bonus Notification] Error recording notification:", error);
  }
}

/**
 * Send bonus progress notification
 * Uses database to track sent notifications (persists across server restarts)
 */
export async function sendBonusProgressNotification(
  promoterId: string,
  promoterName: string,
  promoterEmail: string | null,
  promoterUserId: string | null,
  eventName: string,
  eventId: string,
  checkinsCount: number,
  bonusThreshold: number,
  bonusAmount: number,
  currency: string
): Promise<{ success: boolean; sent?: boolean }> {
  if (!promoterEmail) {
    return { success: false };
  }

  const progress = (checkinsCount / bonusThreshold) * 100;

  // Check if we should send 80% notification
  if (progress >= 80 && progress < 100) {
    // Check database if already sent
    const alreadySent = await hasNotificationBeenSent(promoterId, eventId, "80_percent");
    if (alreadySent) {
      return { success: true, sent: false };
    }

    const remaining = bonusThreshold - checkinsCount;
    const result = await sendTemplateEmail(
      "bonus_progress_80",
      promoterEmail,
      promoterUserId,
      {
        promoter_name: promoterName,
        event_name: eventName,
        checkins_count: checkinsCount,
        bonus_threshold: bonusThreshold,
        remaining_guests: remaining,
        bonus_amount: bonusAmount,
        currency,
      },
      {
        event_id: eventId,
        email_type: "bonus_progress_80",
      }
    );

    if (result.success) {
      await markNotificationSent(promoterId, eventId, "80_percent");
      return { success: true, sent: true };
    }
    return result;
  }

  // Check if we should send 100% notification
  if (progress >= 100) {
    // Check database if already sent
    const alreadySent = await hasNotificationBeenSent(promoterId, eventId, "100_percent");
    if (alreadySent) {
      return { success: true, sent: false };
    }

    const result = await sendTemplateEmail(
      "bonus_achieved",
      promoterEmail,
      promoterUserId,
      {
        promoter_name: promoterName,
        event_name: eventName,
        checkins_count: checkinsCount,
        bonus_threshold: bonusThreshold,
        bonus_amount: bonusAmount,
        currency,
      },
      {
        event_id: eventId,
        email_type: "bonus_achieved",
      }
    );

    if (result.success) {
      await markNotificationSent(promoterId, eventId, "100_percent");
      return { success: true, sent: true };
    }
    return result;
  }

  return { success: true, sent: false };
}

