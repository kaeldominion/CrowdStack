/**
 * URL utilities for generating public-facing URLs
 */

/**
 * Get the base web URL for public pages.
 * Handles the app subdomain -> main domain conversion.
 *
 * Examples:
 * - https://app.crowdstack.app -> https://crowdstack.app
 * - https://app-beta.crowdstack.app -> https://crowdstack.app
 * - http://localhost:3000 -> uses NEXT_PUBLIC_WEB_URL env var
 *
 * @returns The base web URL without trailing slash
 */
export function getWebUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Replace app. or app-beta. subdomain with empty string
    return origin.replace(/app(-beta)?\./, '');
  }
  return process.env.NEXT_PUBLIC_WEB_URL || 'https://crowdstack.app';
}

/**
 * Generate a venue profile URL
 * @param slug - The venue's URL slug
 */
export function getVenueUrl(slug: string): string {
  return `${getWebUrl()}/v/${slug}`;
}

/**
 * Generate an event page URL
 * @param slug - The event's URL slug
 */
export function getEventUrl(slug: string): string {
  return `${getWebUrl()}/e/${slug}`;
}

/**
 * Generate a DJ profile URL
 * @param handle - The DJ's handle
 */
export function getDJUrl(handle: string): string {
  return `${getWebUrl()}/dj/${handle}`;
}

/**
 * Generate a promoter profile URL
 * @param slug - The promoter's URL slug
 */
export function getPromoterUrl(slug: string): string {
  return `${getWebUrl()}/promoter/${slug}`;
}

/**
 * Generate a promoter referral link for an event
 * @param eventSlug - The event's URL slug
 * @param referralCode - The promoter's referral code
 */
export function getPromoterReferralUrl(eventSlug: string, referralCode: string): string {
  return `${getWebUrl()}/e/${eventSlug}?ref=${referralCode}`;
}
