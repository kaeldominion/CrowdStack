import { NextRequest, NextResponse } from "next/server";

/**
 * API route to establish session using tokens
 * 
 * Returns an HTML page that sets cookies via JavaScript and redirects.
 * This is more reliable than trying to set cookies on a redirect response.
 */
export async function GET(request: NextRequest) {
  console.log("[Session API] Received request");
  
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const redirectTo = searchParams.get("redirect") || "/admin";

  console.log("[Session API] Redirect target:", redirectTo);
  console.log("[Session API] Access token present:", !!accessToken);
  console.log("[Session API] Refresh token present:", !!refreshToken);

  if (!accessToken || !refreshToken) {
    console.log("[Session API] Missing tokens, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.log("[Session API] Missing Supabase config");
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  // Extract project ref from Supabase URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
  
  console.log("[Session API] Project ref:", projectRef);

  // Decode the JWT to get user info and expiry
  let jwtPayload: any = {};
  try {
    jwtPayload = JSON.parse(atob(accessToken.split('.')[1]));
  } catch (e) {
    console.log("[Session API] Could not decode JWT");
  }

  const expiresAt = jwtPayload.exp || Math.floor(Date.now() / 1000) + 3600;
  const now = Math.floor(Date.now() / 1000);

  // Build user object from JWT claims (required by Supabase SSR)
  const user = {
    id: jwtPayload.sub,
    aud: jwtPayload.aud,
    role: jwtPayload.role,
    email: jwtPayload.email,
    email_confirmed_at: jwtPayload.email_verified ? new Date().toISOString() : undefined,
    phone: jwtPayload.phone || "",
    confirmed_at: jwtPayload.email_verified ? new Date().toISOString() : undefined,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: jwtPayload.app_metadata || {},
    user_metadata: jwtPayload.user_metadata || {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Create FULL session object that Supabase SSR expects
  const sessionData = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    expires_in: expiresAt - now,
    token_type: "bearer",
    user: user,
  };

  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = JSON.stringify(sessionData);
  
  console.log("[Session API] Setting cookie:", cookieName);
  console.log("[Session API] Session has user:", !!sessionData.user);
  console.log("[Session API] User email:", user.email);
  console.log("[Session API] Cookie value length:", cookieValue.length);

  // Calculate expiry date for cookie
  const expiryDate = new Date(expiresAt * 1000).toUTCString();

  // Return HTML page that sets cookie via JavaScript and redirects
  // This is more reliable than setting cookies on a redirect response
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authenticating...</title>
</head>
<body>
  <p>Authenticating, please wait...</p>
  <script>
    // Set the auth cookie
    const cookieName = ${JSON.stringify(cookieName)};
    const cookieValue = ${JSON.stringify(cookieValue)};
    const expiryDate = ${JSON.stringify(expiryDate)};
    
    // Delete any old cookie first
    document.cookie = cookieName + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Set new cookie
    document.cookie = cookieName + '=' + encodeURIComponent(cookieValue) + '; path=/; expires=' + expiryDate + '; SameSite=Lax';
    
    console.log('[Session] Cookie set:', cookieName);
    console.log('[Session] Cookie length:', cookieValue.length);
    
    // Redirect after a brief delay to ensure cookie is set
    setTimeout(function() {
      window.location.href = ${JSON.stringify(redirectTo)};
    }, 100);
  </script>
</body>
</html>
`;

  console.log("[Session API] Returning HTML page to set cookie and redirect");

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}

