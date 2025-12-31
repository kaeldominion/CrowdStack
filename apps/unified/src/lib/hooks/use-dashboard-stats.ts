'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys, staleTime } from '@/lib/query-client';

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

interface PromoterStats {
  totalCheckIns: number;
  conversionRate: number;
  totalEarnings: number;
  rank: number;
  referrals: number;
  avgPerEvent: number;
}

interface EarningsChartPoint {
  date: string;
  earnings: number;
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

