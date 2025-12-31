'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, staleTime } from '@/lib/query-client';

// Types
interface EventStats {
  registrations: number;
  checkIns: number;
  conversionRate: number;
  capacity: number | null;
  capacityUsed: number;
}

interface LeaderboardEntry {
  promoter_id: string;
  promoter_name: string;
  check_ins: number;
  rank: number;
}

interface LiveMetrics {
  event_id: string;
  event_name: string;
  venue_name: string | null;
  current_attendance: number;
  total_registrations: number;
  capacity: number | null;
  capacity_percentage: number;
  check_ins_last_hour: number;
  check_ins_last_15min: number;
  peak_hour: string | null;
  promoter_stats: LeaderboardEntry[];
  updated_at: string;
}

interface Attendee {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  checked_in?: boolean;
  checked_in_at?: string | null;
  promoter_name?: string | null;
}

// Fetch functions
async function fetchEventStats(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/stats`);
  if (!res.ok) throw new Error('Failed to fetch event stats');
  return res.json() as Promise<EventStats>;
}

async function fetchEventLeaderboard(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json() as Promise<{ leaderboard: LeaderboardEntry[] }>;
}

async function fetchLiveMetrics(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/live-metrics`);
  if (!res.ok) throw new Error('Failed to fetch live metrics');
  return res.json() as Promise<LiveMetrics>;
}

async function fetchEventAttendees(eventId: string, search?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  
  const res = await fetch(`/api/events/${eventId}/attendees?${params}`);
  if (!res.ok) throw new Error('Failed to fetch attendees');
  return res.json() as Promise<{ attendees: Attendee[]; total: number }>;
}

async function checkInAttendee(eventId: string, data: { registration_id?: string; qr_token?: string }) {
  const res = await fetch(`/api/events/${eventId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Check-in failed');
  }
  return res.json();
}

// Hooks

/**
 * Event stats with 30-second cache
 */
export function useEventStats(eventId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.stats(eventId),
    queryFn: () => fetchEventStats(eventId),
    staleTime: staleTime.dashboard,
    enabled,
  });
}

/**
 * Event leaderboard with 30-second cache
 */
export function useEventLeaderboard(eventId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.leaderboard(eventId),
    queryFn: () => fetchEventLeaderboard(eventId),
    staleTime: staleTime.leaderboard,
    enabled,
  });
}

/**
 * Live metrics - real-time, polls every 5 seconds
 * Used on door scanner and live event dashboard
 */
export function useLiveMetrics(eventId: string, enabled = true, pollingInterval = 5000) {
  return useQuery({
    queryKey: queryKeys.events.liveMetrics(eventId),
    queryFn: () => fetchLiveMetrics(eventId),
    staleTime: staleTime.realtime, // Always stale
    refetchInterval: enabled ? pollingInterval : false,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Event attendees with 30-second cache
 */
export function useEventAttendees(eventId: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.attendees(eventId, { search }),
    queryFn: () => fetchEventAttendees(eventId, search),
    staleTime: staleTime.dashboard,
    enabled,
  });
}

/**
 * Check-in mutation with automatic cache invalidation
 */
export function useCheckIn(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { registration_id?: string; qr_token?: string }) => 
      checkInAttendee(eventId, data),
    onSuccess: () => {
      // Invalidate related queries after successful check-in
      queryClient.invalidateQueries({ queryKey: queryKeys.events.liveMetrics(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.stats(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.leaderboard(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.attendees(eventId) });
    },
  });
}

