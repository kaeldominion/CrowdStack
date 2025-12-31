'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys, staleTime } from '@/lib/query-client';

/**
 * Fetch functions for prefetching
 */
async function fetchEventBySlug(slug: string) {
  const res = await fetch(`/api/events/by-slug/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchVenueBySlug(slug: string) {
  const res = await fetch(`/api/venues/by-slug/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchDJByHandle(handle: string) {
  const res = await fetch(`/api/djs/${handle}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Hook providing prefetch callbacks for hover-intent prefetching
 * 
 * Usage:
 * ```tsx
 * const { prefetchEvent } = usePrefetch();
 * <Link onMouseEnter={() => prefetchEvent(event.slug)}>
 * ```
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchEvent = useCallback(
    (slug: string) => {
      // Prefetch event data on hover
      queryClient.prefetchQuery({
        queryKey: queryKeys.events.bySlug(slug),
        queryFn: () => fetchEventBySlug(slug),
        staleTime: staleTime.public,
      });
    },
    [queryClient]
  );

  const prefetchVenue = useCallback(
    (slug: string) => {
      // Prefetch venue data on hover
      queryClient.prefetchQuery({
        queryKey: queryKeys.venues.bySlug(slug),
        queryFn: () => fetchVenueBySlug(slug),
        staleTime: staleTime.public,
      });
    },
    [queryClient]
  );

  const prefetchDJ = useCallback(
    (handle: string) => {
      // Prefetch DJ data on hover
      queryClient.prefetchQuery({
        queryKey: queryKeys.djs.byHandle(handle),
        queryFn: () => fetchDJByHandle(handle),
        staleTime: staleTime.public,
      });
    },
    [queryClient]
  );

  return {
    prefetchEvent,
    prefetchVenue,
    prefetchDJ,
  };
}

