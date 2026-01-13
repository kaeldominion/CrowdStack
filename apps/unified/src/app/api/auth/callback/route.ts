import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import * as Sentry from "@sentry/nextjs";

/**
 * Server-side auth callback route (fallback)
 * Note: Magic links now use the client-side /auth/callback page for better PKCE handling.
 * This route is kept for compatibility with other auth flows.
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
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

  // Get user and check profiles (priority: venue > organizer > promoter > dj > attendee)
  const { data: { user } } = await supabase.auth.getUser();
  
  let targetPath = "/me";
  
  if (user) {
    // First check for special roles (superadmin, door_staff)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleNames = roles?.map((r: any) => r.role) || [];
    
    if (roleNames.includes("superadmin")) {
      targetPath = "/admin";
    } else if (roleNames.includes("door_staff")) {
      targetPath = "/door";
    } else {
      // Check profiles in priority order: venue > organizer > promoter > dj
      // 1. Check for venue profile
      const { data: venueAccess } = await supabase
        .from("venue_users")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (venueAccess && venueAccess.length > 0) {
        targetPath = "/app/venue";
      } else {
        // 2. Check for organizer profile
        const { data: organizerAccess } = await supabase
          .from("organizer_users")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (organizerAccess && organizerAccess.length > 0) {
          targetPath = "/app/organizer";
        } else {
          // 3. Check for promoter profile
          const { data: promoterProfile } = await supabase
            .from("promoters")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (promoterProfile && promoterProfile.length > 0) {
            targetPath = "/app/promoter";
          } else {
            // 4. Check for DJ profile
            const { data: djProfile } = await supabase
              .from("djs")
              .select("id")
              .eq("user_id", user.id)
              .limit(1);

            if (djProfile && djProfile.length > 0) {
              targetPath = "/app/dj";
            }
            // else: default to /me (attendee)
          }
        }
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
        sameSite: (cookie.sameSite as "strict" | "lax" | "none" | undefined) || "lax",
        maxAge: cookie.maxAge,
      });
    });
    return redirectResponse;
  } catch (error: any) {
    // Log to Sentry in production, console in development
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    } else {
      console.error("[Auth Callback] Error:", error);
    }
    
    // Redirect to login with error
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(
      new URL(`/login?error=auth_callback_failed&details=${encodeURIComponent(error.message || "Unknown error")}`, origin)
    );
  }
}
