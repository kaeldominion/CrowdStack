import { QueryClient } from '@tanstack/react-query';

/**
 * Create a new QueryClient with optimized defaults
 * 
 * Stale time configuration:
 * - Tier A (public): 5 minutes
 * - Tier B (dashboards): 60 seconds  
 * - Tier C (realtime): 0 (always refetch)
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time: 60 seconds
        // Override per-query for different tiers
        staleTime: 60 * 1000,
        
        // Cache data for 10 minutes after becoming unused
        gcTime: 10 * 60 * 1000,
        
        // Retry failed requests up to 2 times
        retry: 2,
        
        // Don't refetch on window focus by default
        // Enable per-query for realtime data
        refetchOnWindowFocus: false,
        
        // Refetch on reconnect for better offline recovery
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  });
}

// Query key factories for consistent cache keys
export const queryKeys = {
  // Browse queries
  browse: {
    all: ['browse'] as const,
    events: (filters?: Record<string, unknown>) => 
      ['browse', 'events', filters] as const,
    venues: (filters?: Record<string, unknown>) => 
      ['browse', 'venues', filters] as const,
    djs: (filters?: Record<string, unknown>) => 
      ['browse', 'djs', filters] as const,
  },
  
  // Event queries
  events: {
    all: ['events'] as const,
    detail: (id: string) => ['events', id] as const,
    bySlug: (slug: string) => ['events', 'slug', slug] as const,
    stats: (id: string) => ['events', id, 'stats'] as const,
    attendees: (id: string, filters?: Record<string, unknown>) => 
      ['events', id, 'attendees', filters] as const,
    leaderboard: (id: string) => ['events', id, 'leaderboard'] as const,
    photos: (id: string) => ['events', id, 'photos'] as const,
    liveMetrics: (id: string) => ['events', id, 'live-metrics'] as const,
  },
  
  // Venue queries
  venues: {
    all: ['venues'] as const,
    detail: (id: string) => ['venues', id] as const,
    bySlug: (slug: string) => ['venues', 'slug', slug] as const,
  },
  
  // DJ queries
  djs: {
    all: ['djs'] as const,
    detail: (id: string) => ['djs', id] as const,
    byHandle: (handle: string) => ['djs', 'handle', handle] as const,
  },
  
  // Dashboard queries (user-specific)
  dashboard: {
    organizer: () => ['dashboard', 'organizer'] as const,
    venue: () => ['dashboard', 'venue'] as const,
    promoter: () => ['dashboard', 'promoter'] as const,
    admin: () => ['dashboard', 'admin'] as const,
  },
  
  // User queries
  user: {
    profile: () => ['user', 'profile'] as const,
    notifications: () => ['user', 'notifications'] as const,
  },
} as const;

// Stale time presets (in ms)
export const staleTime = {
  /** Public content: 5 minutes */
  public: 5 * 60 * 1000,
  
  /** Dashboard data: 60 seconds */
  dashboard: 60 * 1000,
  
  /** Leaderboards: 30 seconds */
  leaderboard: 30 * 1000,
  
  /** Near real-time: 10 seconds */
  nearRealtime: 10 * 1000,
  
  /** Real-time: always stale */
  realtime: 0,
} as const;

