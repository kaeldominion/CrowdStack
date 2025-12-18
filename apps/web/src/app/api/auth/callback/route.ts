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

  // Create response for setting cookies
  let redirectTo = redirectParam || "/me";
  
  // Create Supabase client with cookie handlers
  const response = NextResponse.redirect(new URL(redirectTo, origin));

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
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session) {
    console.error("Error exchanging code for session:", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  // Get user and check role
  const { data: { user } } = await supabase.auth.getUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";
  
  // Determine if we need to redirect to app (port 3007)
  const isRedirectingToApp = redirectParam?.includes("localhost:3007") || redirectParam?.includes("3007");
  
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
  
  // If redirecting to app OR user has B2B role, use token-sharing endpoint
  // Cookies are NOT shared between localhost ports, so we MUST pass tokens explicitly
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
    
    const sessionUrl = new URL("/api/auth/session", appUrl);
    sessionUrl.searchParams.set("access_token", session.access_token);
    sessionUrl.searchParams.set("refresh_token", session.refresh_token);
    sessionUrl.searchParams.set("redirect", finalPath);
    return NextResponse.redirect(sessionUrl.toString());
  }

  return response;
}
