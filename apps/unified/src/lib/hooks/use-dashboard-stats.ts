'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys, staleTime } from '@/lib/query-client';
import type { UserRole } from '@crowdstack/shared';

// Types
interface OrganizerStats {
  totalEvents: number;
  registrations: number;
  checkIns: number;
  promoters: number;
  conversionRate: number;
  revenue: number;
}

interface ChartDataPoint {
  date: string;
  registrations: number;
  checkins: number;
}

interface VenueStats {
  totalEvents: number;
  thisMonth: number;
  totalCheckIns: number;
  repeatRate: number;
  avgAttendance: number;
  topEvent: string;
  topEventDetails: {
    id: string;
    name: string;
    registrations: number;
    checkins: number;
    date: string;
  } | null;
}

interface VenueInfo {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
}

interface AttendeeStats {
  totalAttendees: number;
  totalCheckins: number;
  newThisMonth: number;
  repeatVisitors: number;
  flaggedCount: number;
  topAttendees: Array<{
    id: string;
    name: string;
    checkins: number;
    events: number;
    xp_points: number;
  }>;
}

interface PromoterStats {
  totalCheckIns: number;
  conversionRate: number;
  totalEarnings: number;
  earnings?: {
    confirmed: number;
    pending: number;
    estimated: number;
    total: number;
  };
  earningsByCurrency?: Record<string, { confirmed: number; pending: number; estimated: number; total: number }>;
  rank: number;
  referrals: number;
  avgPerEvent: number;
  eventsCount?: number;
}

interface EarningsChartPoint {
  date: string;
  earnings: number;
}

interface PromoterProfile {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  is_public: boolean;
}

interface PromoterEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  flier_url: string | null;
  venue_name: string | null;
  referral_link: string;
  registrations: number;
  checkins: number;
  conversionRate: number;
  isLive: boolean;
  isUpcoming: boolean;
  isPast: boolean;
}

interface OrganizerEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  venue_name: string | null;
  registrations: number;
  checkins: number;
  max_guestlist_size: number | null;
  flier_url: string | null;
  status: string;
  venue_approval_status: string;
}

interface DJStats {
  mixesCount: number;
  totalPlays: number;
  followerCount: number;
  upcomingEventsCount: number;
  gigInvitationsCount: number;
  earnings: { confirmed: number; pending: number; estimated: number; total: number };
  totalEarnings: number;
  referrals: number;
  totalCheckIns: number;
  conversionRate: number;
  eventsPromotedCount: number;
}

interface LiveEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  max_guestlist_size: number | null;
  venue?: { id: string; name: string } | null;
  organizer?: { id: string; name: string } | null;
  registrations: number;
  checkins: number;
}

interface UnifiedDashboardData {
  userRoles: UserRole[];
  organizer?: {
    stats: OrganizerStats;
    chartData: ChartDataPoint[];
    events: {
      liveEvents: OrganizerEvent[];
      upcomingEvents: OrganizerEvent[];
      pastEvents: OrganizerEvent[];
    };
  };
  venue?: {
    stats: VenueStats;
    venue: VenueInfo | null;
    attendeeStats: AttendeeStats;
  };
  promoter?: {
    stats: PromoterStats;
    chartData: EarningsChartPoint[];
    events: {
      liveEvents: PromoterEvent[];
      upcomingEvents: PromoterEvent[];
      pastEvents: PromoterEvent[];
    };
    profile: PromoterProfile | null;
  };
  dj?: {
    stats: DJStats;
    handle: string | null;
  };
  liveEvents: LiveEvent[];
}

// Fetch functions
async function fetchOrganizerDashboard() {
  const res = await fetch('/api/organizer/dashboard-stats');
  if (!res.ok) throw new Error('Failed to fetch organizer dashboard');
  return res.json() as Promise<{
    stats: OrganizerStats;
    chartData: ChartDataPoint[];
  }>;
}

async function fetchVenueDashboard() {
  const res = await fetch('/api/venue/dashboard-stats');
  if (!res.ok) throw new Error('Failed to fetch venue dashboard');
  return res.json() as Promise<{
    stats: VenueStats;
    venue: VenueInfo | null;
  }>;
}

async function fetchPromoterDashboard() {
  const res = await fetch('/api/promoter/dashboard-stats');
  if (!res.ok) throw new Error('Failed to fetch promoter dashboard');
  return res.json() as Promise<{
    stats: PromoterStats;
    earningsChartData: EarningsChartPoint[];
  }>;
}

// Hooks

/**
 * Organizer dashboard stats with 60-second cache
 */
export function useOrganizerDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.organizer(),
    queryFn: fetchOrganizerDashboard,
    staleTime: staleTime.dashboard,
  });
}

/**
 * Venue dashboard stats with 60-second cache
 */
export function useVenueDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.venue(),
    queryFn: fetchVenueDashboard,
    staleTime: staleTime.dashboard,
  });
}

/**
 * Promoter dashboard stats with 60-second cache
 */
export function usePromoterDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.promoter(),
    queryFn: fetchPromoterDashboard,
    staleTime: staleTime.dashboard,
  });
}

// Additional fetch functions

async function fetchDJDashboard() {
  const res = await fetch('/api/dj/dashboard-stats');
  if (!res.ok) throw new Error('Failed to fetch DJ dashboard');
  return res.json() as Promise<{
    stats: DJStats;
  }>;
}

async function fetchDJProfile() {
  const res = await fetch('/api/dj/profile');
  if (!res.ok) throw new Error('Failed to fetch DJ profile');
  return res.json() as Promise<{
    dj: { handle: string } | null;
  }>;
}

async function fetchUnifiedDashboard() {
  const res = await fetch('/api/dashboard/unified');
  if (!res.ok) throw new Error('Failed to fetch unified dashboard');
  return res.json() as Promise<UnifiedDashboardData>;
}

async function fetchLiveEvents(roleType: 'venue' | 'organizer' | 'promoter') {
  const endpoints = {
    venue: '/api/venue/events/live',
    organizer: '/api/organizer/events/live',
    promoter: '/api/promoter/events/live',
  };
  const res = await fetch(endpoints[roleType], { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch live events');
  const data = await res.json();
  return data.events as LiveEvent[];
}

// Additional hooks

/**
 * DJ dashboard stats with 60-second cache
 */
export function useDJDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'dj'] as const,
    queryFn: fetchDJDashboard,
    staleTime: staleTime.dashboard,
  });
}

/**
 * DJ profile handle
 */
export function useDJProfile() {
  return useQuery({
    queryKey: ['dj', 'profile'] as const,
    queryFn: fetchDJProfile,
    staleTime: staleTime.dashboard,
  });
}

/**
 * Unified dashboard - fetches all role-specific data in a single request.
 * This dramatically reduces API calls for multi-role users.
 *
 * @param userRoles - Array of user roles to fetch data for
 * @param venueVersion - Optional version number to invalidate cache on venue switch
 */
export function useUnifiedDashboard(userRoles: string[], venueVersion?: number) {
  return useQuery({
    queryKey: ['dashboard', 'unified', userRoles.sort().join(','), venueVersion] as const,
    queryFn: fetchUnifiedDashboard,
    staleTime: staleTime.dashboard,
    enabled: userRoles.length > 0,
  });
}

/**
 * Dashboard live events with conditional polling.
 * Only polls when there are live events.
 *
 * @param roleType - The primary role to fetch live events for
 * @param hasLiveEvents - Whether there are currently live events (enables polling)
 * @param pollInterval - Polling interval in ms (default: 30000)
 */
export function useDashboardLiveEvents(
  roleType: 'venue' | 'organizer' | 'promoter' | null,
  hasLiveEvents: boolean = false,
  pollInterval: number = 30000
) {
  return useQuery({
    queryKey: ['dashboard-live-events', roleType] as const,
    queryFn: () => fetchLiveEvents(roleType!),
    staleTime: staleTime.nearRealtime,
    enabled: !!roleType,
    refetchInterval: hasLiveEvents ? pollInterval : false,
    refetchOnWindowFocus: hasLiveEvents,
  });
}

// Type exports for consumers
export type {
  OrganizerStats,
  ChartDataPoint,
  VenueStats,
  VenueInfo,
  AttendeeStats,
  PromoterStats,
  EarningsChartPoint,
  PromoterProfile,
  PromoterEvent,
  OrganizerEvent,
  DJStats,
  LiveEvent,
  UnifiedDashboardData,
};

