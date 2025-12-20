import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Extract session from localhost custom cookie format
 */
function getLocalhostSession(cookieStore: Awaited<ReturnType<typeof cookies>>, supabaseUrl: string) {
  try {
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
    const authCookieName = `sb-${projectRef}-auth-token`;
    const authCookie = cookieStore.get(authCookieName);

    if (!authCookie) {
      return null;
    }

    const cookieValue = decodeURIComponent(authCookie.value);
    const parsed = JSON.parse(cookieValue);

    if (parsed.access_token && parsed.user && parsed.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (parsed.expires_at > now) {
        return {
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
          expires_at: parsed.expires_at,
          user: parsed.user,
        };
      }
    }
  } catch (e) {
    // Not our custom cookie format, return null
  }
  return null;
}

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * This client respects user authentication via cookies
 * 
 * @param cookieStore - Optional cookie store. If provided, cookies() won't be called again.
 *                      This prevents OpenTelemetry context errors when cookies() is already called.
 */
export async function createClient(cookieStore?: Awaited<ReturnType<typeof cookies>>) {
  // Only call cookies() if not provided - prevents multiple calls in same request
  const store = cookieStore || await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // Check for custom localhost auth cookie (token-sharing workaround)
  const localhostSession = getLocalhostSession(store, supabaseUrl);

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });

  // If we have a custom session cookie on localhost, manually set the session
  // Supabase SSR doesn't know about our custom cookie format
  if (localhostSession) {
    try {
      const { data, error } = await client.auth.setSession({
        access_token: localhostSession.access_token,
        refresh_token: localhostSession.refresh_token,
      });
      
      if (error) {
        console.warn("[createClient] Failed to set session from custom cookie:", error.message);
        // Try using the service client to verify the token is valid
        const serviceClient = createServiceRoleClient();
        const { data: userData, error: userError } = await serviceClient.auth.getUser(localhostSession.access_token);
        if (!userError && userData?.user) {
          // Token is valid, manually set it using the service client approach
          // For now, we'll let it fail and return the client - the middleware should handle it
        }
      }
    } catch (e) {
      console.warn("[createClient] Error setting session:", e);
      // Continue anyway - middleware might handle authentication
    }
  }

  return client;
}

/**
 * Create a Supabase service role client for admin operations
 * This client bypasses RLS and should only be used in server-side code
 * NEVER expose this to the client
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role key. Please check SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
