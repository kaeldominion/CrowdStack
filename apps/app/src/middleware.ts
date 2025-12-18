import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware that handles auth for the app
 * - On localhost: reads manually-set cookies (token-sharing workaround)
 * - On production: uses standard Supabase SSR (cookies shared via subdomain)
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3006";

  console.log("[App Middleware] Path:", pathname);

  // Public routes that don't require auth
  const publicRoutes = ["/health", "/api/health", "/api/auth/session", "/api/auth/callback"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    console.log("[App Middleware] Public route, allowing");
    return NextResponse.next();
  }

  // If someone goes to /login on the app, redirect to web login
  if (pathname === "/login" || pathname.startsWith("/login")) {
    console.log("[App Middleware] Login route, redirecting to web login");
    const redirectParam = request.nextUrl.searchParams.get("redirect") || "/admin";
    
    // In local dev with unified origin, use relative paths (same origin)
    // In production, use full URLs
    const isLocalDev = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
    const loginUrl = new URL("/login", webUrl);
    
    if (isLocalDev) {
      // Local dev: redirect param should just be the path (same origin)
      loginUrl.searchParams.set("redirect", redirectParam.startsWith("/") ? redirectParam : `/${redirectParam}`);
    } else {
      // Production: include full app URL
      loginUrl.searchParams.set("redirect", `${appUrl}${redirectParam}`);
    }
    
    return NextResponse.redirect(loginUrl);
  }

  // Detect environment
  const isLocalhost = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  let user: any = null;
  
  if (isLocalhost) {
    // LOCALHOST: Read our manually-set cookie (token-sharing workaround)
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
    const authCookieName = `sb-${projectRef}-auth-token`;
    const authCookie = request.cookies.get(authCookieName);
    
    if (authCookie) {
      console.log("[App Middleware] Localhost: Auth cookie found");
      try {
        const cookieValue = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(cookieValue);
        
        if (parsed.access_token && parsed.user) {
          const now = Math.floor(Date.now() / 1000);
          if (parsed.expires_at && parsed.expires_at > now) {
            user = parsed.user;
            console.log("[App Middleware] Valid session for:", user.email);
          } else {
            console.log("[App Middleware] Token expired");
          }
        }
      } catch (e) {
        console.log("[App Middleware] Could not parse cookie");
      }
    } else {
      console.log("[App Middleware] No auth cookie found");
    }
  } else {
    // PRODUCTION: Use standard Supabase SSR (cookies shared via subdomain)
    console.log("[App Middleware] Production: Using Supabase SSR");
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Middleware can't set cookies, but that's okay for reading
          },
        },
      });
      
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      user = supabaseUser;
      
      if (user) {
        console.log("[App Middleware] Supabase session for:", user.email);
      }
    }
  }

  // If not authenticated, redirect to web login
  if (!user) {
    console.log("[App Middleware] No valid session, redirecting to login");
    const isLocalDev = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
    const loginUrl = new URL("/login", webUrl);
    
    if (isLocalDev) {
      // Local dev: redirect param should just be the pathname (same origin)
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
    } else {
      // Production: include full URL
      loginUrl.searchParams.set("redirect", request.url);
    }
    
    return NextResponse.redirect(loginUrl);
  }
  
  console.log("[App Middleware] User authenticated:", user.email);

  // Don't redirect /app anymore - it's the unified dashboard
  // Root redirect is handled by the page component
  if (pathname === "/") {
    // Let the root page handle the redirect based on roles
    return NextResponse.next();
  }

  // All authenticated users can access all routes for now
  // Role-based protection can be added later once Supabase SSR cookie format is fixed
  console.log("[App Middleware] Allowing access to:", pathname);
  return NextResponse.next();
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


