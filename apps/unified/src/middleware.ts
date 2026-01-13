import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Unified middleware that handles authentication for all routes
 * - Public routes: homepage, login, contact, event pages, health
 * - Protected routes: admin, app (B2B dashboards), door scanner
 * - Uses standard Supabase SSR (no proxying needed - single origin)
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (process.env.NODE_ENV === "development") {
    console.log("[Middleware] Path:", pathname);
  }

  // Public routes that don't require auth
  const publicRoutes = [
    "/",
    "/login",
    "/contact",
    "/legal",
    "/health",
    "/api/health",
    "/api/auth/callback",
    "/api/auth/session",
    "/api/auth/magic-link",
    "/auth/callback", // Client-side magic link callback
    "/auth/magic", // Legacy magic link page
  ];

  // Public API route patterns (specific endpoints that should be accessible)
  const publicApiPatterns = [
    "/api/events/by-slug/", // Public event pages
    "/api/events/", // Photos GET route - handled by route itself, but allow through middleware
    "/api/venues/by-slug/", // Public venue pages
    "/api/venues/", // Venue events route
  ];

  // Public route patterns
  const publicPatterns = [
    "/e/", // Event pages
    "/v/", // Venue pages
    "/invite/", // Invite pages
    "/i/", // Invite code pages
    "/p/", // Photo pages
    "/checkin/", // Check-in pages
    "/door/invite/", // Door staff invite pages (viewing only, accepting requires auth)
  ];

  // Cacheable routes - skip session refresh to enable ISR caching
  // These routes serve the same content to all users, session refresh would
  // mark responses as dynamic and prevent caching
  const cacheablePatterns = [
    "/e/", // Event pages - high traffic, must be cached
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route) ||
    publicPatterns.some((pattern) => pathname.startsWith(pattern)) ||
    publicApiPatterns.some((pattern) => pathname.startsWith(pattern));

  if (isPublicRoute) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] Public route, allowing:", pathname);
    }

    // Check if this is a cacheable route - skip session refresh to enable ISR
    const isCacheableRoute = cacheablePatterns.some((pattern) => pathname.startsWith(pattern));
    if (isCacheableRoute) {
      // For cacheable routes, just pass through without any response modification
      // This allows Next.js ISR to properly cache the page
      return NextResponse.next();
    }

    // For other public routes, still refresh session
    return refreshSession(request);
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    "/admin",
    "/app",
    "/door",
    "/scanner",
    "/dashboard",
    "/me", // Attendee dashboard
  ];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute) {
    // Unknown route - allow but refresh session
    return refreshSession(request);
  }

  // Check authentication for protected routes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Middleware] Missing Supabase configuration");
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Extract cookies first for logging and fallback parsing
  const allCookies = request.cookies.getAll();
  const cookieNames = allCookies.map(c => c.name);
  const supabaseCookies = allCookies.filter(c => c.name.includes('sb-') || c.name.includes('supabase'));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Try getSession first (more reliable in middleware)
  let session: any = null;
  let user: any = null;
  let sessionError: any = null;
  let userError: any = null;

  // First try standard Supabase SSR
  const sessionResult = await supabase.auth.getSession();
  session = sessionResult.data.session;
  sessionError = sessionResult.error;
  
  const userResult = await supabase.auth.getUser();
  user = userResult.data.user;
  userError = userResult.error;

  // If that fails and we have the custom cookie, try parsing it manually
  // NOTE: This is primarily for localhost development. In production on Vercel,
  // Supabase SSR should work correctly with standard cookies, so this fallback
  // should rarely (if ever) be needed.
  const isLocalhost = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
  if (!session && !user && supabaseCookies.length > 0 && isLocalhost) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] Standard SSR failed on localhost, trying manual cookie parse...");
    }
    try {
      const authCookie = supabaseCookies[0];
      // Only try custom format on localhost (production uses standard Supabase cookie format)
      if (authCookie.name.includes("-auth-token")) {
        const cookieValue = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(cookieValue);
        
        if (parsed.access_token && parsed.user && parsed.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          if (parsed.expires_at > now) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Middleware] ✅ Successfully parsed custom cookie format (localhost)");
            }
            user = parsed.user;
            session = {
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
              expires_at: parsed.expires_at,
              user: parsed.user,
            };
            // Clear errors since manual parsing succeeded
            sessionError = null;
            userError = null;
          } else {
            if (process.env.NODE_ENV === "development") {
              console.log("[Middleware] Cookie expired");
            }
          }
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Middleware] Failed to parse custom cookie:", e);
      }
    }
  } else if (!session && !user && !isLocalhost) {
    // In production, if standard SSR fails, log it for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] ⚠️ Standard SSR failed in production - this should not happen normally");
    }
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log("[Middleware] Auth check:", {
      pathname,
      hasSession: !!session,
      hasUser: !!user,
      userEmail: user?.email,
      sessionError: sessionError?.message,
      userError: userError?.message,
      totalCookies: allCookies.length,
      cookieNames: cookieNames,
      supabaseCookies: supabaseCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 })),
    });
  }

  // Check both session and user - if either exists, we're authenticated
  // Only fail if BOTH are missing (errors don't matter if we have a valid session/user)
  if (!session && !user) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] ❌ No valid session, redirecting to login. SessionError:", sessionError?.message, "UserError:", userError?.message);
    }
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const authenticatedUser = user || session?.user;
  if (process.env.NODE_ENV === "development") {
    console.log("[Middleware] ✅ User authenticated:", authenticatedUser?.email);
  }
  return response;
}

/**
 * Refresh session for public routes (keeps session alive)
 */
function refreshSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session (fire and forget)
  supabase.auth.getUser().catch(() => {
    // Ignore errors in session refresh for public routes
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

