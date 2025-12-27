"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner, PageLoader } from "@crowdstack/ui";

function LoadingFallback() {
  return <PageLoader message="Loading..." />;
}

/**
 * Magic link callback content - redirects to server-side API route
 * This ensures PKCE code verifier is handled properly via cookies
 */
function MagicLinkContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get code and redirect from URL
    const code = searchParams.get("code");
    const redirect = searchParams.get("redirect");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      // If there's a redirect, go back to it with error
      if (redirect) {
        const redirectUrl = new URL(redirect, window.location.origin);
        redirectUrl.searchParams.set("magic_link_error", "failed");
        window.location.replace(redirectUrl.toString());
        return;
      }
      // Otherwise redirect to login with error
      window.location.replace(`/login?error=${encodeURIComponent(errorParam)}`);
      return;
    }

    if (!code) {
      // If there's a redirect, go back to it with error
      if (redirect) {
        const redirectUrl = new URL(redirect, window.location.origin);
        redirectUrl.searchParams.set("magic_link_error", "no_code");
        window.location.replace(redirectUrl.toString());
        return;
      }
      // No code, redirect to login
      window.location.replace("/login?error=no_code");
      return;
    }

    // Redirect to client-side callback page which handles PKCE properly
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("code", code);
    if (redirect) {
      callbackUrl.searchParams.set("redirect", redirect);
    }

    window.location.replace(callbackUrl.toString());
  }, [searchParams]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <LoadingSpinner text="Verifying magic link..." size="lg" />
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MagicLinkContent />
    </Suspense>
  );
}
