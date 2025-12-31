/**
 * Performance monitoring utilities
 */

const SLOW_THRESHOLD_MS = 500;

/**
 * Measure execution time of an async function
 * Logs warning if execution exceeds threshold
 */
export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  options?: { threshold?: number; alwaysLog?: boolean }
): Promise<T> {
  const start = Date.now();
  
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    const threshold = options?.threshold ?? SLOW_THRESHOLD_MS;
    
    if (duration > threshold || options?.alwaysLog) {
      const level = duration > threshold ? 'warn' : 'log';
      console[level](`[PERF] ${name}: ${duration}ms`);
    }
  }
}

/**
 * Create a timer for manual timing
 */
export function createTimer(name: string) {
  const start = Date.now();
  
  return {
    /** Get elapsed time in ms */
    elapsed: () => Date.now() - start,
    
    /** End timer and log if slow */
    end: (options?: { threshold?: number }) => {
      const duration = Date.now() - start;
      const threshold = options?.threshold ?? SLOW_THRESHOLD_MS;
      
      if (duration > threshold) {
        console.warn(`[PERF] ${name}: ${duration}ms`);
      }
      
      return duration;
    },
    
    /** Log a checkpoint without ending */
    checkpoint: (label: string) => {
      const duration = Date.now() - start;
      console.log(`[PERF] ${name} → ${label}: ${duration}ms`);
      return duration;
    },
  };
}

/**
 * Decorator-style timing for route handlers
 * Use: export const GET = withRouteMetrics('venue-by-slug', handler);
 */
export function withRouteMetrics<T extends (...args: any[]) => Promise<Response>>(
  routeName: string,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now();
    
    try {
      const response = await handler(...args);
      const duration = Date.now() - start;
      
      // Log slow routes
      if (duration > SLOW_THRESHOLD_MS) {
        console.warn(`[PERF] Route ${routeName}: ${duration}ms`);
      }
      
      // Add timing header in development
      if (process.env.NODE_ENV === 'development') {
        const headers = new Headers(response.headers);
        headers.set('X-Response-Time', `${duration}ms`);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[PERF] Route ${routeName} failed after ${duration}ms:`, error);
      throw error;
    }
  }) as T;
}

