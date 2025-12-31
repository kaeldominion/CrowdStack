/**
 * Cache utilities for consistent caching across the application
 * 
 * Tier A: Public content, CDN-cacheable (s-maxage)
 * Tier B: Private/authenticated, browser-cacheable (private, max-age)
 * Tier C: Real-time, no caching (no-store)
 */

export type CacheTier = 'public-long' | 'public-short' | 'private' | 'realtime';

interface CacheConfig {
  tier: CacheTier;
  /** Override default TTL in seconds */
  maxAge?: number;
  /** Override stale-while-revalidate in seconds */
  swr?: number;
}

/**
 * Get Cache-Control header value based on tier
 */
export function getCacheControl(config: CacheConfig): string {
  const { tier, maxAge, swr } = config;

  switch (tier) {
    case 'public-long':
      // Tier A: Public pages, CDN-cacheable for 2-5 minutes
      // Example: venue pages, event pages, browse data
      return `public, s-maxage=${maxAge ?? 300}, stale-while-revalidate=${swr ?? 600}`;

    case 'public-short':
      // Tier A: Public pages, CDN-cacheable for 1-2 minutes
      // Example: browse events (changes more frequently)
      return `public, s-maxage=${maxAge ?? 60}, stale-while-revalidate=${swr ?? 300}`;

    case 'private':
      // Tier B: Authenticated dashboards, browser-only cache
      // Example: dashboard stats, leaderboards
      return `private, max-age=${maxAge ?? 60}, stale-while-revalidate=${swr ?? 120}`;

    case 'realtime':
      // Tier C: No caching - check-in, payouts, live metrics
      return 'no-store, must-revalidate';

    default:
      return 'no-store';
  }
}

/**
 * Create headers object with Cache-Control
 */
export function cacheHeaders(config: CacheConfig): HeadersInit {
  const headers: HeadersInit = {
    'Cache-Control': getCacheControl(config),
  };

  // Add debug header in development
  if (process.env.NODE_ENV === 'development') {
    headers['X-Cache-Tier'] = config.tier;
  }

  return headers;
}

/**
 * Response helper - creates NextResponse.json with cache headers
 */
export function jsonWithCache<T>(
  data: T,
  config: CacheConfig,
  init?: ResponseInit
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...cacheHeaders(config),
      ...(init?.headers || {}),
    },
  });
}

// Pre-configured cache options for common use cases
export const CACHE = {
  /** Public venue/DJ pages - 5 min CDN cache */
  publicEntity: { tier: 'public-long' as const, maxAge: 300, swr: 600 },
  
  /** Public event pages - 2 min CDN cache (events change more) */
  publicEvent: { tier: 'public-short' as const, maxAge: 120, swr: 300 },
  
  /** Browse listings - 1 min CDN cache */
  publicBrowse: { tier: 'public-short' as const, maxAge: 60, swr: 300 },
  
  /** Dashboard stats - 1 min private cache */
  dashboardStats: { tier: 'private' as const, maxAge: 60, swr: 120 },
  
  /** Leaderboards - 30 sec private cache */
  leaderboard: { tier: 'private' as const, maxAge: 30, swr: 60 },
  
  /** Real-time flows - no cache */
  realtime: { tier: 'realtime' as const },
} as const;

