/**
 * Server-side Vercel Analytics event tracking utilities
 * 
 * Use this module in API routes and server components to track events server-side.
 * 
 * @example
 * import { trackServerEvent } from "@/lib/analytics/server";
 * await trackServerEvent("user_registered", { userId: "123" });
 */

import { track } from "@vercel/analytics/server";

/**
 * Track an event from the server
 * 
 * @param eventName - Name of the event (e.g., "user_registered")
 * @param properties - Optional properties to attach to the event
 */
export async function trackServerEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): Promise<void> {
  try {
    await track(eventName, properties);
  } catch (error) {
    console.error("[Analytics] Error tracking server event:", error);
  }
}

// Server-side convenience functions that wrap trackServerEvent
export async function trackEventCreated(eventId: string, eventName: string, organizerId: string, venueId?: string): Promise<void> {
  await trackServerEvent("event_created", {
    event_id: eventId,
    event_name: eventName,
    organizer_id: organizerId,
    venue_id: venueId || null,
  });
}

export async function trackEventRegistration(
  eventId: string,
  eventName: string,
  attendeeId: string,
  hasReferral: boolean,
  promoterId?: string
): Promise<void> {
  await trackServerEvent("event_registration", {
    event_id: eventId,
    event_name: eventName,
    attendee_id: attendeeId,
    has_referral: hasReferral,
    promoter_id: promoterId || null,
  });
}

export async function trackCheckIn(
  eventId: string,
  eventName: string,
  attendeeId: string,
  registrationId: string,
  checkedInBy: string,
  method: "qr_code" | "manual" | "quick_add"
): Promise<void> {
  await trackServerEvent("attendee_checkin", {
    event_id: eventId,
    event_name: eventName,
    attendee_id: attendeeId,
    registration_id: registrationId,
    checked_in_by: checkedInBy,
    method,
  });
}

export async function trackQuickAdd(eventId: string, eventName: string, attendeeId: string): Promise<void> {
  await trackServerEvent("quick_add", {
    event_id: eventId,
    event_name: eventName,
    attendee_id: attendeeId,
  });
}

export async function trackReferralClick(eventId: string, promoterId: string, referrerUserId: string): Promise<void> {
  await trackServerEvent("referral_click", {
    event_id: eventId,
    promoter_id: promoterId,
    referrer_user_id: referrerUserId,
  });
}

export async function trackReferralConversion(
  eventId: string,
  promoterId: string,
  attendeeId: string,
  registrationId: string
): Promise<void> {
  await trackServerEvent("referral_conversion", {
    event_id: eventId,
    promoter_id: promoterId,
    attendee_id: attendeeId,
    registration_id: registrationId,
  });
}

export async function trackPhotoUpload(eventId: string, photoCount: number, isBulk: boolean): Promise<void> {
  await trackServerEvent("photo_upload", {
    event_id: eventId,
    photo_count: photoCount,
    is_bulk: isBulk,
  });
}

export async function trackPhotoPublished(eventId: string, photoCount: number): Promise<void> {
  await trackServerEvent("photo_published", {
    event_id: eventId,
    photo_count: photoCount,
  });
}

export async function trackPayoutGenerated(
  eventId: string,
  eventName: string,
  promoterCount: number,
  totalAmount: number
): Promise<void> {
  await trackServerEvent("payout_generated", {
    event_id: eventId,
    event_name: eventName,
    promoter_count: promoterCount,
    total_amount: totalAmount,
  });
}

export async function trackEventPublished(eventId: string, eventName: string): Promise<void> {
  await trackServerEvent("event_published", {
    event_id: eventId,
    event_name: eventName,
  });
}

export async function trackEventApproved(eventId: string, eventName: string, venueId: string): Promise<void> {
  await trackServerEvent("event_approved", {
    event_id: eventId,
    event_name: eventName,
    venue_id: venueId,
  });
}

export async function trackEventRejected(eventId: string, eventName: string, venueId: string): Promise<void> {
  await trackServerEvent("event_rejected", {
    event_id: eventId,
    event_name: eventName,
    venue_id: venueId,
  });
}

export async function trackPromoterApproved(eventId: string, promoterId: string, organizerId: string): Promise<void> {
  await trackServerEvent("promoter_approved", {
    event_id: eventId,
    promoter_id: promoterId,
    organizer_id: organizerId,
  });
}

