import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side API route to request magic link
 * This ensures PKCE code verifier is stored in cookies (not localStorage)
 * so the server-side callback can access it
 */
export async function POST(request: NextRequest) {
  try {
    const { email, redirect } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    // Create response for setting cookies
    // Use a redirect response to ensure cookies are properly set
    const response = NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

    // Create server client that stores PKCE code verifier in cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure cookies are set with proper options for persistence
            response.cookies.set(name, value, {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax',
              httpOnly: options?.httpOnly !== false, // Default to httpOnly for security
              secure: options?.secure !== false && process.env.NODE_ENV === 'production',
              maxAge: options?.maxAge || 60 * 60 * 24, // 24 hours default
            });
          });
        },
      },
    });

    // Determine callback URL
    const origin = request.nextUrl.origin;
    const callbackUrl = `${origin}/api/auth/callback`;
    const redirectTo = redirect 
      ? `${callbackUrl}?redirect=${encodeURIComponent(redirect)}`
      : callbackUrl;

    // Log cookies before request
    const cookiesBefore = request.cookies.getAll();
    console.log("[Magic Link API] Cookies before request:", cookiesBefore.map(c => c.name));

    // Request magic link (this will store PKCE code verifier in cookies)
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (magicError) {
      console.error("[Magic Link API] Error:", magicError);
      return NextResponse.json(
        { error: magicError.message },
        { status: 400 }
      );
    }

    // Log cookies after request
    const cookiesAfter = response.cookies.getAll();
    console.log("[Magic Link API] Cookies after request:", cookiesAfter.map(c => c.name));
    console.log("[Magic Link API] Cookie details:", cookiesAfter.map(c => ({
      name: c.name,
      value: c.value.substring(0, 20) + "...",
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      path: c.path,
    })));

    // Return response with cookies set
    return response;
  } catch (error: any) {
    console.error("[Magic Link API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

