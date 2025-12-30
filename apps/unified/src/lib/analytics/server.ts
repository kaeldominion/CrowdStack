/**
 * Server-side Vercel Analytics event tracking utilities
 * 
 * Use this module in API routes and server components to track events server-side.
 * 
 * @example
 * import { trackServerEvent } from "@/lib/analytics/server";
 * await trackServerEvent("user_registered", { userId: "123" }, request);
 */

import { track } from "@vercel/analytics/server";
import { NextRequest } from "next/server";

/**
 * Track an event from the server
 * 
 * @param eventName - Name of the event (e.g., "user_registered")
 * @param properties - Optional properties to attach to the event
 * @param request - NextRequest object (required for proper tracking)
 */
export async function trackServerEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
  request?: NextRequest
): Promise<void> {
  // Only log in development or if explicitly enabled
  const isDevelopment = process.env.NODE_ENV === "development";
  const enableAnalyticsDebug = process.env.ENABLE_ANALYTICS_DEBUG === "true";

  try {
    if (isDevelopment || enableAnalyticsDebug) {
      console.log("[Analytics] Tracking server event:", {
        eventName,
        properties,
        hasRequest: !!request,
        url: request?.url,
      });
    }

    // Vercel Analytics server-side tracking
    // IMPORTANT: Custom events require Vercel Pro or Enterprise plan
    // The track function from @vercel/analytics/server accepts:
    // track(eventName, properties, options)
    // where options can contain { request: NextRequest }
    if (request) {
      await track(eventName, properties, { request });
      if (isDevelopment || enableAnalyticsDebug) {
        console.log("[Analytics] Event tracked successfully with request");
      }
    } else {
      // Fallback: track without request (may not work in all environments)
      await track(eventName, properties);
      if (isDevelopment || enableAnalyticsDebug) {
        console.log("[Analytics] Event tracked successfully without request");
      }
    }
  } catch (error) {
    // Always log errors
    console.error("[Analytics] Error tracking server event:", error);
    console.error("[Analytics] Event name:", eventName);
    console.error("[Analytics] Properties:", JSON.stringify(properties, null, 2));
    console.error("[Analytics] Has request:", !!request);
    
    if (error instanceof Error) {
      console.error("[Analytics] Error message:", error.message);
      console.error("[Analytics] Error stack:", error.stack);
      
      // Check if it's a plan-related error
      if (error.message.includes("plan") || error.message.includes("upgrade")) {
        console.error("[Analytics] ⚠️  Custom events require Vercel Pro or Enterprise plan");
        console.error("[Analytics] Please check your Vercel plan in the dashboard");
      }
    }
  }
}

// Server-side convenience functions that wrap trackServerEvent
export async function trackEventCreated(
  eventId: string,
  eventName: string,
  organizerId: string,
  request: NextRequest,
  venueId?: string
): Promise<void> {
  await trackServerEvent(
    "event_created",
    {
      event_id: eventId,
      event_name: eventName,
      organizer_id: organizerId,
      venue_id: venueId || null,
    },
    request
  );
}

export async function trackEventRegistration(
  eventId: string,
  eventName: string,
  attendeeId: string,
  hasReferral: boolean,
  request: NextRequest,
  promoterId?: string
): Promise<void> {
  await trackServerEvent(
    "event_registration",
    {
      event_id: eventId,
      event_name: eventName,
      attendee_id: attendeeId,
      has_referral: hasReferral,
      promoter_id: promoterId || null,
    },
    request
  );
}

export async function trackCheckIn(
  eventId: string,
  eventName: string,
  attendeeId: string,
  registrationId: string,
  checkedInBy: string,
  method: "qr_code" | "manual" | "quick_add",
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "attendee_checkin",
    {
      event_id: eventId,
      event_name: eventName,
      attendee_id: attendeeId,
      registration_id: registrationId,
      checked_in_by: checkedInBy,
      method,
    },
    request
  );
}

export async function trackQuickAdd(
  eventId: string,
  eventName: string,
  attendeeId: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "quick_add",
    {
      event_id: eventId,
      event_name: eventName,
      attendee_id: attendeeId,
    },
    request
  );
}

export async function trackReferralClick(
  eventId: string,
  promoterId: string,
  referrerUserId: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "referral_click",
    {
      event_id: eventId,
      promoter_id: promoterId,
      referrer_user_id: referrerUserId,
    },
    request
  );
}

export async function trackReferralConversion(
  eventId: string,
  promoterId: string,
  attendeeId: string,
  registrationId: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "referral_conversion",
    {
      event_id: eventId,
      promoter_id: promoterId,
      attendee_id: attendeeId,
      registration_id: registrationId,
    },
    request
  );
}

export async function trackPhotoUpload(
  eventId: string,
  photoCount: number,
  isBulk: boolean,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "photo_upload",
    {
      event_id: eventId,
      photo_count: photoCount,
      is_bulk: isBulk,
    },
    request
  );
}

export async function trackPhotoPublished(
  eventId: string,
  photoCount: number,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "photo_published",
    {
      event_id: eventId,
      photo_count: photoCount,
    },
    request
  );
}

export async function trackPayoutGenerated(
  eventId: string,
  eventName: string,
  promoterCount: number,
  totalAmount: number,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "payout_generated",
    {
      event_id: eventId,
      event_name: eventName,
      promoter_count: promoterCount,
      total_amount: totalAmount,
    },
    request
  );
}

export async function trackEventPublished(
  eventId: string,
  eventName: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "event_published",
    {
      event_id: eventId,
      event_name: eventName,
    },
    request
  );
}

export async function trackEventApproved(
  eventId: string,
  eventName: string,
  venueId: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "event_approved",
    {
      event_id: eventId,
      event_name: eventName,
      venue_id: venueId,
    },
    request
  );
}

export async function trackEventRejected(
  eventId: string,
  eventName: string,
  venueId: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "event_rejected",
    {
      event_id: eventId,
      event_name: eventName,
      venue_id: venueId,
    },
    request
  );
}

export async function trackPromoterApproved(
  eventId: string,
  promoterId: string,
  organizerId: string,
  request: NextRequest
): Promise<void> {
  await trackServerEvent(
    "promoter_approved",
    {
      event_id: eventId,
      promoter_id: promoterId,
      organizer_id: organizerId,
    },
    request
  );
}

