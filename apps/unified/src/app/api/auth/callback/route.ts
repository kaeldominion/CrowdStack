import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side auth callback route (fallback)
 * Note: Magic links now use the client-side /auth/callback page for better PKCE handling.
 * This route is kept for compatibility with other auth flows.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectParam = requestUrl.searchParams.get("redirect");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  let redirectTo = redirectParam || "/me";
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

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session) {
    const errorMessage = error?.message || "Unknown error";
    
    // If there's a redirect param, redirect back to it with error flag
    // This allows the registration page to show password fallback
    if (redirectParam) {
      const redirectUrl = new URL(redirectParam, origin);
      if (errorMessage.includes("PKCE") || errorMessage.includes("verifier") || errorMessage.includes("same browser")) {
        redirectUrl.searchParams.set("magic_link_error", "pkce");
      } else if (errorMessage.includes("already been used") || errorMessage.includes("expired")) {
        redirectUrl.searchParams.set("magic_link_error", "expired");
      } else {
        redirectUrl.searchParams.set("magic_link_error", "failed");
      }
      return NextResponse.redirect(redirectUrl);
    }
    
    // No redirect param, go to login page
    if (errorMessage.includes("PKCE") || errorMessage.includes("verifier")) {
      return NextResponse.redirect(
        new URL("/login?error=pkce_error&message=" + encodeURIComponent("Please use the magic link in the same browser where you requested it."), origin)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed&details=${encodeURIComponent(errorMessage)}`, origin)
    );
  }

  // Get user and check role
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if user has B2B roles
  let targetPath = "/me";
  
  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles && roles.length > 0) {
      const roleNames = roles.map((r: any) => r.role);
      
      if (roleNames.includes("superadmin")) {
        targetPath = "/admin";
      } else if (roleNames.includes("venue_admin")) {
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
  
  // Use redirect param if provided
  const finalPath = redirectParam || targetPath;
  
  const redirectResponse = NextResponse.redirect(new URL(finalPath, origin));
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
  return redirectResponse;
}
