import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side auth callback route
 * Exchanges the code for a session and redirects based on user role or redirect param
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectParam = requestUrl.searchParams.get("redirect");
  const origin = requestUrl.origin; // This captures http://localhost:3006 or http://localhost:3007

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  // Create response for setting cookies (we'll update redirect after exchange)
  let redirectTo = redirectParam || "/me";
  
  // Create temporary response for cookie handling
  const response = new NextResponse(null, { status: 200 });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Exchange code for session
  // Debug: Log cookies available (especially PKCE verifier)
  const allCookies = request.cookies.getAll();
  const cookieNames = allCookies.map(c => c.name);
  console.log("[Auth Callback] Available cookies:", cookieNames);
  console.log("[Auth Callback] Looking for PKCE cookies:", cookieNames.filter(n => n.includes("code-verifier") || n.includes("pkce")));
  console.log("[Auth Callback] Code:", code?.substring(0, 20) + "...");
  console.log("[Auth Callback] Origin:", origin);

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session) {
    console.error("[Auth Callback] Error exchanging code for session:", error);
    console.error("[Auth Callback] Error details:", JSON.stringify(error, null, 2));
    
    // More specific error message
    const errorMessage = error?.message || "Unknown error";
    const errorCode = error?.status || 500;
    
    // If PKCE error, suggest clearing cookies and trying again
    if (errorMessage.includes("PKCE") || errorMessage.includes("code verifier")) {
      return NextResponse.redirect(
        new URL("/login?error=pkce_error&message=" + encodeURIComponent(errorMessage), origin)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed&details=${encodeURIComponent(errorMessage)}`, origin)
    );
  }

  console.log("[Auth Callback] Session created successfully for user:", session.user?.email);

  // Now create redirect response with cookies
  const redirectResponse = NextResponse.redirect(new URL(redirectTo, origin));
  
  // Copy all cookies from the exchange response to the redirect response
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path || "/",
      domain: cookie.domain,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as any,
      maxAge: cookie.maxAge,
    });
  });

  // Get user and check role
  const { data: { user } } = await supabase.auth.getUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3006";
  
  // With unified origin, we check if redirecting to /app/* routes
  // Also check for old 3007 URLs (legacy redirects)
  const isRedirectingToApp = redirectParam?.startsWith("/app") || 
                              redirectParam?.startsWith("/door") || 
                              redirectParam?.startsWith("/admin") ||
                              redirectParam?.includes("localhost:3007");
  
  // Check if user has B2B roles
  let shouldGoToApp = false;
  let targetPath = "/admin"; // Default for app
  
  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles && roles.length > 0) {
      const roleNames = roles.map((r: any) => r.role);
      
      // B2B roles go to app
      if (roleNames.includes("venue_admin") || roleNames.includes("event_organizer") || 
          roleNames.includes("promoter") || roleNames.includes("door_staff")) {
        shouldGoToApp = true;
        
        // Determine target path based on role
        if (roleNames.includes("venue_admin")) {
          targetPath = "/app/venue";
        } else if (roleNames.includes("event_organizer")) {
          targetPath = "/app/organizer";
        } else if (roleNames.includes("promoter")) {
          targetPath = "/app/promoter";
        } else if (roleNames.includes("door_staff")) {
          targetPath = "/door";
        }
      }
    }
  }
  
  // Check if we're in local dev with unified origin
  const isLocalDev = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_APP_ENV === "local";
  
  // If redirecting to app OR user has B2B role
  if (shouldGoToApp || isRedirectingToApp) {
    // Extract path from redirectParam (could be full URL or just path)
    let finalPath = targetPath;
    if (redirectParam) {
      try {
        // If it's a full URL, extract the pathname
        finalPath = new URL(redirectParam).pathname;
      } catch {
        // If it's just a path, use it directly
        finalPath = redirectParam;
      }
    }
    
    // In local dev with unified origin, just redirect to the path (cookies are shared)
    if (isLocalDev && appUrl.includes("localhost:3006")) {
      const localRedirectResponse = NextResponse.redirect(new URL(finalPath, origin));
      // Copy cookies to the redirect
      redirectResponse.cookies.getAll().forEach((cookie) => {
        localRedirectResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path || "/",
          domain: cookie.domain,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as any,
          maxAge: cookie.maxAge,
        });
      });
      return localRedirectResponse;
    }
    
    // Production or old local setup: use token-sharing endpoint
    const sessionUrl = new URL("/api/auth/session", appUrl);
    sessionUrl.searchParams.set("access_token", session.access_token);
    sessionUrl.searchParams.set("refresh_token", session.refresh_token);
    sessionUrl.searchParams.set("redirect", finalPath);
    const tokenRedirectResponse = NextResponse.redirect(sessionUrl.toString());
    // Copy cookies
    redirectResponse.cookies.getAll().forEach((cookie) => {
      tokenRedirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || "/",
        domain: cookie.domain,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as any,
        maxAge: cookie.maxAge,
      });
    });
    return tokenRedirectResponse;
  }

  return redirectResponse;
}
