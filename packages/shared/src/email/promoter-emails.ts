import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import { sendTemplateEmail } from "./template-renderer";

/**
 * Check if promoter has received welcome email
 */
async function hasReceivedWelcomeEmail(promoterId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("promoter_onboarding_sent")
    .select("promoter_id")
    .eq("promoter_id", promoterId)
    .single();

  return !!data;
}

/**
 * Mark promoter as having received welcome email
 */
async function markWelcomeEmailSent(
  promoterId: string,
  userId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase.from("promoter_onboarding_sent").insert({
    promoter_id: promoterId,
    sent_by: userId,
  });
}

/**
 * Send promoter welcome email (one-time only)
 */
export async function sendPromoterWelcomeEmail(
  promoterId: string,
  promoterName: string,
  promoterEmail: string | null,
  promoterUserId: string | null,
  eventId?: string
): Promise<{ success: boolean; skipped?: boolean }> {
  if (!promoterEmail) {
    return { success: false, skipped: true };
  }

  // Check if already sent
  if (await hasReceivedWelcomeEmail(promoterId)) {
    return { success: true, skipped: true };
  }

  const result = await sendTemplateEmail(
    "promoter_welcome",
    promoterEmail,
    promoterUserId,
    {
      promoter_name: promoterName,
      promoter_email: promoterEmail,
    },
    {
      event_id: eventId || null,
      email_type: "promoter_welcome",
    }
  );

  if (result.success) {
    await markWelcomeEmailSent(promoterId, promoterUserId);
  }

  return result;
}

interface BonusTier {
  threshold: number;
  amount: number;
  repeatable: boolean;
  label?: string;
}

interface EventDetails {
  eventId: string;
  eventName: string;
  eventSlug: string;
  eventDate: string;
  eventEndDate?: string | null;
  eventDescription?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  flierUrl?: string | null;
  referralLink: string;
}

/**
 * Send event assignment email to promoter
 */
export async function sendEventAssignmentEmail(
  promoterId: string,
  promoterName: string,
  promoterEmail: string | null,
  promoterUserId: string | null,
  eventDetails: EventDetails,
  payoutTerms: {
    currency?: string | null;
    per_head_rate?: number | null;
    per_head_min?: number | null;
    per_head_max?: number | null;
    bonus_threshold?: number | null;
    bonus_amount?: number | null;
    bonus_tiers?: BonusTier[] | null;
    fixed_fee?: number | null;
    minimum_guests?: number | null;
    below_minimum_percent?: number | null;
  },
  eventCurrency: string
): Promise<{ success: boolean }> {
  if (!promoterEmail) {
    return { success: false };
  }

  const currency = payoutTerms.currency || eventCurrency;
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format payout terms for email
  const termsParts: string[] = [];

  // Per Head Payment
  if (payoutTerms.per_head_rate) {
    let perHeadText = `${formatAmount(payoutTerms.per_head_rate)} per guest`;
    const conditions: string[] = [];
    if (payoutTerms.per_head_min) {
      conditions.push(`min ${payoutTerms.per_head_min} guests`);
    }
    if (payoutTerms.per_head_max) {
      conditions.push(`max ${payoutTerms.per_head_max} guests`);
    }
    if (conditions.length > 0) {
      perHeadText += ` (${conditions.join(", ")})`;
    }
    termsParts.push(perHeadText);
  }

  // Fixed Fee with Minimum Requirement
  if (payoutTerms.fixed_fee) {
    let fixedText = `Fixed fee: ${formatAmount(payoutTerms.fixed_fee)}`;
    if (payoutTerms.minimum_guests && payoutTerms.below_minimum_percent !== 100) {
      fixedText += ` (${payoutTerms.below_minimum_percent}% if below ${payoutTerms.minimum_guests} guests)`;
    }
    termsParts.push(fixedText);
  }

  // Tiered/Repeatable Bonuses
  if (payoutTerms.bonus_tiers && payoutTerms.bonus_tiers.length > 0) {
    payoutTerms.bonus_tiers.forEach((tier) => {
      if (tier.repeatable) {
        termsParts.push(
          `Bonus: ${formatAmount(tier.amount)} every ${tier.threshold} guests${tier.label ? ` (${tier.label})` : ""}`
        );
      } else {
        termsParts.push(
          `Bonus: ${formatAmount(tier.amount)} at ${tier.threshold} guests${tier.label ? ` (${tier.label})` : ""}`
        );
      }
    });
  } else if (payoutTerms.bonus_threshold && payoutTerms.bonus_amount) {
    // Legacy single bonus
    termsParts.push(
      `Bonus: ${formatAmount(payoutTerms.bonus_amount)} at ${payoutTerms.bonus_threshold} guests`
    );
  }

  // Currency indicator if different from event
  if (payoutTerms.currency && payoutTerms.currency !== eventCurrency) {
    termsParts.push(`(Currency: ${payoutTerms.currency})`);
  }

  const payoutTermsText = termsParts.length > 0 
    ? termsParts.join("\n• ") 
    : "To be determined";

  // Format event date/time
  const startDate = new Date(eventDetails.eventDate);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  let eventTimeText = `${formattedDate} at ${formattedTime}`;
  if (eventDetails.eventEndDate) {
    const endDate = new Date(eventDetails.eventEndDate);
    const endTime = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    eventTimeText += ` - ${endTime}`;
  }

  // Format venue address
  const venueParts = [
    eventDetails.venueName,
    eventDetails.venueAddress,
    eventDetails.venueCity,
    eventDetails.venueState,
  ].filter(Boolean);
  const venueText = venueParts.length > 0 ? venueParts.join(", ") : "Venue TBA";

  // Dashboard URL for QR code generation
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
  const dashboardUrl = `${baseUrl}/app/promoter/events`;

  return sendTemplateEmail(
    "promoter_event_assigned",
    promoterEmail,
    promoterUserId,
    {
      promoter_name: promoterName,
      event_name: eventDetails.eventName,
      event_date: formattedDate,
      event_time: formattedTime,
      event_time_full: eventTimeText,
      event_description: eventDetails.eventDescription || "",
      venue_name: eventDetails.venueName || "Venue TBA",
      venue_address: venueText,
      flier_image_url: eventDetails.flierUrl || "",
      referral_link: eventDetails.referralLink,
      dashboard_url: dashboardUrl,
      payout_terms: payoutTermsText,
      currency,
    },
    {
      event_id: eventDetails.eventId,
      email_type: "promoter_event_assigned",
    }
  );
}

/**
 * Send payout terms updated email
 */
export async function sendTermsUpdatedEmail(
  promoterId: string,
  promoterName: string,
  promoterEmail: string | null,
  promoterUserId: string | null,
  eventName: string,
  oldTerms: Record<string, any>,
  newTerms: Record<string, any>,
  eventId?: string
): Promise<{ success: boolean }> {
  if (!promoterEmail) {
    return { success: false };
  }

  // Create diff text
  const changes: string[] = [];
  Object.keys(newTerms).forEach((key) => {
    if (oldTerms[key] !== newTerms[key]) {
      changes.push(
        `${key}: ${oldTerms[key] || "none"} → ${newTerms[key] || "none"}`
      );
    }
  });

  return sendTemplateEmail(
    "promoter_terms_updated",
    promoterEmail,
    promoterUserId,
    {
      promoter_name: promoterName,
      event_name: eventName,
      changes: changes.join("\n"),
    },
    {
      event_id: eventId || null,
      email_type: "promoter_terms_updated",
    }
  );
}

/**
 * Send payout ready email
 */
export async function sendPayoutReadyEmail(
  promoterId: string,
  promoterName: string,
  promoterEmail: string | null,
  promoterUserId: string | null,
  eventName: string,
  payoutAmount: number,
  currency: string,
  statementUrl?: string,
  eventId?: string
): Promise<{ success: boolean }> {
  if (!promoterEmail) {
    return { success: false };
  }

  return sendTemplateEmail(
    "payout_ready",
    promoterEmail,
    promoterUserId,
    {
      promoter_name: promoterName,
      event_name: eventName,
      payout_amount: payoutAmount,
      currency,
      statement_url: statementUrl || "",
    },
    {
      event_id: eventId || null,
      email_type: "payout_ready",
    }
  );
}

/**
 * Send payment received email
 */
export async function sendPaymentReceivedEmail(
  promoterId: string,
  promoterName: string,
  promoterEmail: string | null,
  promoterUserId: string | null,
  eventName: string,
  payoutAmount: number,
  currency: string,
  proofUrl?: string,
  eventId?: string
): Promise<{ success: boolean }> {
  if (!promoterEmail) {
    return { success: false };
  }

  return sendTemplateEmail(
    "payment_received",
    promoterEmail,
    promoterUserId,
    {
      promoter_name: promoterName,
      event_name: eventName,
      payout_amount: payoutAmount,
      currency,
      proof_url: proofUrl || "",
    },
    {
      event_id: eventId || null,
      email_type: "payment_received",
    }
  );
}

