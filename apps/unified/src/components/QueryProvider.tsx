'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * React Query provider for client-side data caching
 * 
 * This wraps the app with QueryClientProvider and includes
 * devtools in development for cache inspection.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a stable QueryClient instance per browser session
  // Using useState ensures the client is created once and persists
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools only in development - lazy loaded */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

