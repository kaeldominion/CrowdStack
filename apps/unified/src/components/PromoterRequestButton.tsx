"use client";

interface PromoterRequestButtonProps {
  eventId: string;
  eventSlug: string;
}

/**
 * PromoterRequestButton Component
 * 
 * DISABLED: Promoter request feature is currently disabled.
 * Promoters must be added manually with payment terms defined.
 * 
 * Previous implementation can be found in git history if needed for re-enablement.
 */
export function PromoterRequestButton({ eventId, eventSlug }: PromoterRequestButtonProps) {
  // Promoter request feature is disabled - returning null to hide the component
  return null;
}
