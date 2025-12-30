/**
 * Vercel Analytics event tracking utilities
 * 
 * This module provides a centralized way to track custom events with Vercel Analytics.
 * All events are sent to Vercel Analytics for in-depth insights.
 * 
 * @see https://vercel.com/docs/analytics/custom-events
 */

import { track } from "@vercel/analytics";

/**
 * Base event tracking function (client-side only)
 * Use this for custom events, or use the pre-built functions below
 * 
 * @param eventName - Name of the event (e.g., "user_registered")
 * @param properties - Optional properties to attach to the event
 * 
 * @example
 * trackEvent("custom_action", { userId: "123", action: "clicked_button" });
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window === "undefined") {
    // Server-side: use trackServerEvent from @vercel/analytics/server instead
    console.warn("[Analytics] trackEvent called server-side. Use trackServerEvent instead.");
    return;
  }

  try {
    track(eventName, properties);
  } catch (error) {
    console.error("[Analytics] Error tracking event:", error);
  }
}

/**
 * Server-side event tracking function
 * Import this in API routes: import { trackServerEvent } from "@/lib/analytics/server"
 * 
 * This is a separate export to avoid client-side bundle bloat
 */
export async function trackServerEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): Promise<void> {
  if (typeof window !== "undefined") {
    // Client-side: use trackEvent instead
    trackEvent(eventName, properties);
    return;
  }

  try {
    // Dynamic import for server-side only
    const { track } = await import("@vercel/analytics/server");
    await track(eventName, properties);
  } catch (error) {
    console.error("[Analytics] Error tracking server event:", error);
  }
}

// ============================================
// Authentication & User Events
// ============================================

/**
 * Track user login
 */
export function trackUserLogin(method: "magic_link" | "password" | "invite"): void {
  trackEvent("user_login", { method });
}

/**
 * Track user registration/signup
 */
export function trackUserSignup(method: "magic_link" | "invite" | "event_registration"): void {
  trackEvent("user_signup", { method });
}

/**
 * Track invite acceptance
 */
export function trackInviteAccepted(role: string, inviteType?: string): void {
  trackEvent("invite_accepted", { role, invite_type: inviteType || "unknown" });
}

/**
 * Track password set (account claim)
 */
export function trackPasswordSet(): void {
  trackEvent("password_set");
}

// ============================================
// Event Management Events
// ============================================

/**
 * Track event creation
 */
export function trackEventCreated(eventId: string, eventName: string, organizerId: string, venueId?: string): void {
  trackEvent("event_created", {
    event_id: eventId,
    event_name: eventName,
    organizer_id: organizerId,
    venue_id: venueId || null,
  });
}

/**
 * Track event published
 */
export function trackEventPublished(eventId: string, eventName: string): void {
  trackEvent("event_published", {
    event_id: eventId,
    event_name: eventName,
  });
}

/**
 * Track event unpublished
 */
export function trackEventUnpublished(eventId: string, eventName: string): void {
  trackEvent("event_unpublished", {
    event_id: eventId,
    event_name: eventName,
  });
}

/**
 * Track event edited
 */
export function trackEventEdited(eventId: string, fieldsChanged: string[]): void {
  trackEvent("event_edited", {
    event_id: eventId,
    fields_changed: fieldsChanged.join(","),
  });
}

/**
 * Track event viewed
 */
export function trackEventViewed(eventId: string, eventSlug: string, isPublic: boolean): void {
  trackEvent("event_viewed", {
    event_id: eventId,
    event_slug: eventSlug,
    is_public: isPublic,
  });
}

/**
 * Track event approved by venue
 */
export function trackEventApproved(eventId: string, eventName: string, venueId: string): void {
  trackEvent("event_approved", {
    event_id: eventId,
    event_name: eventName,
    venue_id: venueId,
  });
}

/**
 * Track event rejected by venue
 */
export function trackEventRejected(eventId: string, eventName: string, venueId: string): void {
  trackEvent("event_rejected", {
    event_id: eventId,
    event_name: eventName,
    venue_id: venueId,
  });
}

/**
 * Track event featured toggle
 */
export function trackEventFeatured(eventId: string, isFeatured: boolean): void {
  trackEvent("event_featured", {
    event_id: eventId,
    is_featured: isFeatured,
  });
}

// ============================================
// Attendee Registration & Check-in Events
// ============================================

/**
 * Track event registration
 */
export function trackEventRegistration(
  eventId: string,
  eventName: string,
  attendeeId: string,
  hasReferral: boolean,
  promoterId?: string
): void {
  trackEvent("event_registration", {
    event_id: eventId,
    event_name: eventName,
    attendee_id: attendeeId,
    has_referral: hasReferral,
    promoter_id: promoterId || null,
  });
}

/**
 * Track check-in
 */
export function trackCheckIn(
  eventId: string,
  eventName: string,
  attendeeId: string,
  registrationId: string,
  checkedInBy: string,
  method: "qr_code" | "manual" | "quick_add"
): void {
  trackEvent("attendee_checkin", {
    event_id: eventId,
    event_name: eventName,
    attendee_id: attendeeId,
    registration_id: registrationId,
    checked_in_by: checkedInBy,
    method,
  });
}

/**
 * Track quick-add at door
 */
export function trackQuickAdd(eventId: string, eventName: string, attendeeId: string): void {
  trackEvent("quick_add", {
    event_id: eventId,
    event_name: eventName,
    attendee_id: attendeeId,
  });
}

// ============================================
// Promoter Events
// ============================================

/**
 * Track referral link click
 */
export function trackReferralClick(eventId: string, promoterId: string, referrerUserId: string): void {
  trackEvent("referral_click", {
    event_id: eventId,
    promoter_id: promoterId,
    referrer_user_id: referrerUserId,
  });
}

/**
 * Track referral registration (conversion)
 */
export function trackReferralConversion(
  eventId: string,
  promoterId: string,
  attendeeId: string,
  registrationId: string
): void {
  trackEvent("referral_conversion", {
    event_id: eventId,
    promoter_id: promoterId,
    attendee_id: attendeeId,
    registration_id: registrationId,
  });
}

/**
 * Track promoter request
 */
export function trackPromoterRequest(eventId: string, promoterId: string, organizerId: string): void {
  trackEvent("promoter_request", {
    event_id: eventId,
    promoter_id: promoterId,
    organizer_id: organizerId,
  });
}

/**
 * Track promoter approval
 */
export function trackPromoterApproved(eventId: string, promoterId: string, organizerId: string): void {
  trackEvent("promoter_approved", {
    event_id: eventId,
    promoter_id: promoterId,
    organizer_id: organizerId,
  });
}

/**
 * Track promoter removed
 */
export function trackPromoterRemoved(eventId: string, promoterId: string): void {
  trackEvent("promoter_removed", {
    event_id: eventId,
    promoter_id: promoterId,
  });
}

// ============================================
// Photo Events
// ============================================

/**
 * Track photo upload
 */
export function trackPhotoUpload(eventId: string, photoCount: number, isBulk: boolean): void {
  trackEvent("photo_upload", {
    event_id: eventId,
    photo_count: photoCount,
    is_bulk: isBulk,
  });
}

/**
 * Track photo published
 */
export function trackPhotoPublished(eventId: string, photoCount: number): void {
  trackEvent("photo_published", {
    event_id: eventId,
    photo_count: photoCount,
  });
}

/**
 * Track photo deleted
 */
export function trackPhotoDeleted(eventId: string, photoId: string): void {
  trackEvent("photo_deleted", {
    event_id: eventId,
    photo_id: photoId,
  });
}

/**
 * Track cover photo set
 */
export function trackCoverPhotoSet(eventId: string, photoId: string): void {
  trackEvent("cover_photo_set", {
    event_id: eventId,
    photo_id: photoId,
  });
}

// ============================================
// Payout Events
// ============================================

/**
 * Track payout generation
 */
export function trackPayoutGenerated(
  eventId: string,
  eventName: string,
  promoterCount: number,
  totalAmount: number
): void {
  trackEvent("payout_generated", {
    event_id: eventId,
    event_name: eventName,
    promoter_count: promoterCount,
    total_amount: totalAmount,
  });
}

// ============================================
// Venue & Organizer Events
// ============================================

/**
 * Track venue created
 */
export function trackVenueCreated(venueId: string, venueName: string): void {
  trackEvent("venue_created", {
    venue_id: venueId,
    venue_name: venueName,
  });
}

/**
 * Track organizer created
 */
export function trackOrganizerCreated(organizerId: string, organizerName: string): void {
  trackEvent("organizer_created", {
    organizer_id: organizerId,
    organizer_name: organizerName,
  });
}

// ============================================
// Error & Performance Events
// ============================================

/**
 * Track error occurrence
 */
export function trackError(errorType: string, errorMessage: string, context?: Record<string, string>): void {
  trackEvent("error_occurred", {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
}

/**
 * Track API performance
 */
export function trackAPIPerformance(endpoint: string, duration: number, status: number): void {
  trackEvent("api_performance", {
    endpoint,
    duration_ms: duration,
    status_code: status,
  });
}

