"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Magic link callback page - redirects to server-side API route
 * This ensures PKCE code verifier is handled properly via cookies
 */
export default function MagicLinkPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get code and redirect from URL
    const code = searchParams.get("code");
    const redirect = searchParams.get("redirect");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      // Redirect to login with error
      window.location.replace(`/login?error=${encodeURIComponent(errorParam)}`);
      return;
    }

    if (!code) {
      // No code, redirect to login
      window.location.replace("/login?error=no_code");
      return;
    }

    // Redirect to server-side API callback which handles PKCE properly
    const callbackUrl = new URL("/api/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("code", code);
    if (redirect) {
      callbackUrl.searchParams.set("redirect", redirect);
    }

    window.location.replace(callbackUrl.toString());
  }, [searchParams]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/60">Verifying magic link...</p>
      </div>
    </div>
  );
}

