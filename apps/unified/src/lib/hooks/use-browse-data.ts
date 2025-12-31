'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, staleTime } from '@/lib/query-client';

// Types
interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  flier_url?: string | null;
  cover_image_url?: string | null;
  capacity?: number | null;
  registration_count?: number;
  venue?: {
    name: string;
    city?: string | null;
  } | null;
}

interface Venue {
  id: string;
  name: string;
  slug: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  tags?: { tag_type: string; tag_value: string }[];
}

interface DJ {
  id: string;
  name: string;
  handle: string;
  bio?: string | null;
  genres?: string[] | null;
  location?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  follower_count?: number | null;
  event_count?: number | null;
}

interface BrowseFilters {
  search?: string;
  city?: string;
  genre?: string;
  date?: string;
  featured?: boolean;
  live?: boolean;
  past?: boolean;
}

// Fetch functions
async function fetchBrowseEvents(filters: BrowseFilters, limit = 12, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (filters.search) params.append('search', filters.search);
  if (filters.city) params.append('city', filters.city);
  if (filters.genre) params.append('genre', filters.genre);
  if (filters.date) params.append('date', filters.date);
  if (filters.featured) params.append('featured', 'true');
  if (filters.live) params.append('live', 'true');
  if (filters.past) params.append('past', 'true');

  const res = await fetch(`/api/browse/events?${params}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json() as Promise<{
    events: Event[];
    count: number;
    totalCount: number;
  }>;
}

async function fetchBrowseVenues(filters: BrowseFilters, limit = 12, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (filters.search) params.append('search', filters.search);
  if (filters.city) params.append('city', filters.city);

  const res = await fetch(`/api/browse/venues?${params}`);
  if (!res.ok) throw new Error('Failed to fetch venues');
  return res.json() as Promise<{
    venues: Venue[];
    count: number;
  }>;
}

async function fetchBrowseDJs(filters: BrowseFilters, limit = 12, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (filters.search) params.append('search', filters.search);
  if (filters.genre) params.append('genre', filters.genre);

  const res = await fetch(`/api/browse/djs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch DJs');
  return res.json() as Promise<{
    djs: DJ[];
    count: number;
    totalCount: number;
  }>;
}

// Hooks

/**
 * Fetch browse events with caching
 * Uses 2-minute stale time for public browse data
 */
export function useBrowseEvents(filters: BrowseFilters = {}, limit = 12) {
  return useQuery({
    queryKey: queryKeys.browse.events({ ...filters, limit }),
    queryFn: () => fetchBrowseEvents(filters, limit, 0),
    staleTime: staleTime.public,
  });
}

/**
 * Infinite scroll for browse events
 */
export function useBrowseEventsInfinite(filters: BrowseFilters = {}, limit = 12) {
  return useInfiniteQuery({
    queryKey: queryKeys.browse.events({ ...filters, limit, infinite: true }),
    queryFn: ({ pageParam = 0 }) => fetchBrowseEvents(filters, limit, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.events.length, 0);
      return totalFetched < lastPage.totalCount ? totalFetched : undefined;
    },
    staleTime: staleTime.public,
  });
}

/**
 * Fetch featured events (for landing page carousel)
 */
export function useFeaturedEvents(limit = 6) {
  return useQuery({
    queryKey: queryKeys.browse.events({ featured: true, limit }),
    queryFn: () => fetchBrowseEvents({ featured: true }, limit, 0),
    staleTime: staleTime.public,
  });
}

/**
 * Fetch live events
 */
export function useLiveEvents(search?: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.browse.events({ live: true, search, limit }),
    queryFn: () => fetchBrowseEvents({ live: true, search }, limit, 0),
    staleTime: staleTime.nearRealtime, // 10 seconds for live events
  });
}

/**
 * Fetch browse venues with caching
 */
export function useBrowseVenues(filters: BrowseFilters = {}, limit = 12) {
  return useQuery({
    queryKey: queryKeys.browse.venues({ ...filters, limit }),
    queryFn: () => fetchBrowseVenues(filters, limit, 0),
    staleTime: staleTime.public,
  });
}

/**
 * Infinite scroll for browse venues
 */
export function useBrowseVenuesInfinite(filters: BrowseFilters = {}, limit = 12) {
  return useInfiniteQuery({
    queryKey: queryKeys.browse.venues({ ...filters, limit, infinite: true }),
    queryFn: ({ pageParam = 0 }) => fetchBrowseVenues(filters, limit, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.venues.length, 0);
      // Venues endpoint doesn't return totalCount, so check if we got a full page
      return lastPage.venues.length === limit ? totalFetched : undefined;
    },
    staleTime: staleTime.public,
  });
}

/**
 * Fetch browse DJs with caching
 */
export function useBrowseDJs(filters: BrowseFilters = {}, limit = 12) {
  return useQuery({
    queryKey: queryKeys.browse.djs({ ...filters, limit }),
    queryFn: () => fetchBrowseDJs(filters, limit, 0),
    staleTime: staleTime.public,
  });
}

/**
 * Infinite scroll for browse DJs
 */
export function useBrowseDJsInfinite(filters: BrowseFilters = {}, limit = 12) {
  return useInfiniteQuery({
    queryKey: queryKeys.browse.djs({ ...filters, limit, infinite: true }),
    queryFn: ({ pageParam = 0 }) => fetchBrowseDJs(filters, limit, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.djs.length, 0);
      return totalFetched < lastPage.totalCount ? totalFetched : undefined;
    },
    staleTime: staleTime.public,
  });
}

