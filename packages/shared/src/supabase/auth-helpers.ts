import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Retry configuration for auth operations
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100, // ms
  maxDelay: 2000, // ms
  backoffMultiplier: 2,
};

/**
 * Check if an error is a network-related error that should be retried
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code?.toLowerCase() || "";
  const errorCause = error.cause?.code?.toLowerCase() || "";
  
  // Check for network errors
  const networkErrorPatterns = [
    "fetch failed",
    "socket",
    "timeout",
    "etimedout",
    "econnreset",
    "econnrefused",
    "und_err_socket",
    "other side closed",
  ];
  
  return (
    networkErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || 
      errorCode.includes(pattern) || 
      errorCause.includes(pattern)
    )
  );
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Get user with retry logic for network failures
 */
export async function getUserWithRetry(
  supabase: SupabaseClient,
  retries = RETRY_CONFIG.maxRetries
): Promise<{ data: { user: any } | null; error: any }> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await supabase.auth.getUser();
      
      // If successful, return immediately
      if (!result.error) {
        return result;
      }
      
      // If it's not a retryable error, return immediately
      if (!isRetryableError(result.error)) {
        return result;
      }
      
      lastError = result.error;
      
      // If this is the last attempt, return the error
      if (attempt === retries) {
        return result;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = calculateDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error: any) {
      lastError = error;
      
      // If it's not a retryable error, return immediately
      if (!isRetryableError(error)) {
        return { data: { user: null }, error };
      }
      
      // If this is the last attempt, return the error
      if (attempt === retries) {
        return { data: { user: null }, error };
      }
      
      // Wait before retrying (exponential backoff)
      const delay = calculateDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { data: { user: null }, error: lastError };
}

