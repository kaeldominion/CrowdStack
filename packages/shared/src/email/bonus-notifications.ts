import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendTemplateEmail } from "./template-renderer";

interface BonusNotificationState {
  promoterId: string;
  eventId: string;
  threshold80Sent: boolean;
  threshold100Sent: boolean;
}

// In-memory cache to track sent notifications (prevents duplicates in same session)
// In production, consider using Redis or database table
const notificationCache = new Map<string, BonusNotificationState>();

/**
 * Get or create notification state for promoter/event
 */
function getNotificationState(
  promoterId: string,
  eventId: string
): BonusNotificationState {
  const key = `${promoterId}:${eventId}`;
  if (!notificationCache.has(key)) {
    notificationCache.set(key, {
      promoterId,
      eventId,
      threshold80Sent: false,
      threshold100Sent: false,
    });
  }
  return notificationCache.get(key)!;
}

/**
 * Send bonus progress notification
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
  const state = getNotificationState(promoterId, eventId);

  // Check if we should send 80% notification
  if (progress >= 80 && progress < 100 && !state.threshold80Sent) {
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
      state.threshold80Sent = true;
      return { success: true, sent: true };
    }
    return result;
  }

  // Check if we should send 100% notification
  if (progress >= 100 && !state.threshold100Sent) {
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
      state.threshold100Sent = true;
      return { success: true, sent: true };
    }
    return result;
  }

  return { success: true, sent: false };
}

