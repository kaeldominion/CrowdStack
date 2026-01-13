"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PageLoader, LoadingSpinner } from "@crowdstack/ui";

// Singleton client to avoid multiple instances
let callbackClientInstance: SupabaseClient | null = null;

function getCallbackClient(): SupabaseClient {
  if (callbackClientInstance) {
    return callbackClientInstance;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  callbackClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  
  return callbackClientInstance;
}

// Track if we've already started processing to avoid React StrictMode double-execution issues
let isProcessing = false;
let hasSucceeded = false;

function LoadingFallback() {
  return <PageLoader message="Loading..." />;
}

/**
 * Client-side auth callback page
 * This page handles the magic link callback by exchanging the code for a session
 * using the browser client, which has access to localStorage where the
 * PKCE code_verifier is stored.
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Verifying...");
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Skip if we've already successfully authenticated or are currently processing
    if (hasSucceeded || hasAttemptedRef.current) {
      return;
    }
    hasAttemptedRef.current = true;
    
    const handleCallback = async () => {
      // Double-check we're not already processing
      if (isProcessing) return;
      isProcessing = true;
      
      const code = searchParams.get("code");
      const redirectParam = searchParams.get("redirect");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Handle errors from Supabase
      if (errorParam) {
        console.error("[Auth Callback] Error from Supabase:", errorParam, errorDescription);
        isProcessing = false;
        setError(errorDescription || errorParam);
        return;
      }

      if (!code) {
        console.error("[Auth Callback] No code provided");
        isProcessing = false;
        setError("No authorization code provided");
        return;
      }

      try {
        setStatus("Exchanging code for session...");
        
        const supabase = getCallbackClient();
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("[Auth Callback] Exchange error:", exchangeError.message);
          isProcessing = false;
          
          if (exchangeError.message.includes("already been used") || exchangeError.message.includes("expired")) {
            // If there's a redirect param, go back to it with error
            if (redirectParam) {
              const redirectUrl = new URL(redirectParam, window.location.origin);
              redirectUrl.searchParams.set("magic_link_error", "expired");
              window.location.replace(redirectUrl.toString());
              return;
            }
            setError("This magic link has already been used or has expired. Please request a new one.");
          } else if (exchangeError.message.includes("PKCE") || exchangeError.message.includes("verifier") || exchangeError.message.includes("same browser") || exchangeError.message.includes("code_verifier")) {
            // PKCE error - common on iOS Safari when link opens in different browser context
            // Redirect back with error flag to show OTP or password fallback
            if (redirectParam) {
              const redirectUrl = new URL(redirectParam, window.location.origin);
              redirectUrl.searchParams.set("magic_link_error", "pkce");
              window.location.replace(redirectUrl.toString());
              return;
            }
            setError("The magic link opened in a different browser. On iOS, you can enter the 6-digit code from the email instead, or use password login.");
          } else {
            // Other errors - try to redirect back if we have redirect param
            if (redirectParam) {
              const redirectUrl = new URL(redirectParam, window.location.origin);
              redirectUrl.searchParams.set("magic_link_error", "failed");
              window.location.replace(redirectUrl.toString());
              return;
            }
            setError(`Authentication failed: ${exchangeError.message}`);
          }
          return;
        }

        if (!data.session) {
          console.error("[Auth Callback] No session returned");
          isProcessing = false;
          setError("Failed to create session");
          return;
        }

        // Mark as succeeded to prevent any further attempts from showing errors
        hasSucceeded = true;
        
        console.log("[Auth Callback] Session created for:", data.session.user?.email);
        setStatus("Session created! Redirecting...");
        
        // Set the custom cookie format that the server-side expects
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
        const cookieName = `sb-${projectRef}-auth-token`;
        
        const cookieValue = JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user,
        });
        
        const expiresAt = data.session.expires_at ? new Date(data.session.expires_at * 1000) : undefined;
        const cookieOptions = expiresAt 
          ? `; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
          : `; path=/; SameSite=Lax`;
        document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}${cookieOptions}`;

        // Determine redirect destination based on profiles (priority: venue > organizer > promoter > dj > attendee)
        const user = data.session.user;
        let targetPath = redirectParam || "/me";

        if (user && !redirectParam) {
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

        // Override with redirect param if it's an app/admin/door path
        if (redirectParam && (redirectParam.startsWith("/app") || redirectParam.startsWith("/admin") || redirectParam.startsWith("/door"))) {
          targetPath = redirectParam;
        }

        console.log("[Auth Callback] Redirecting to:", targetPath);
        
        // Redirect immediately - don't wait
        window.location.href = targetPath;
      } catch (err: any) {
        console.error("[Auth Callback] Unexpected error:", err);
        isProcessing = false;
        if (!hasSucceeded) {
          setError(err.message || "An unexpected error occurred");
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);
  
  // Don't show error if we've already succeeded
  if (hasSucceeded) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner text="Redirecting..." size="lg" />
      </div>
    );
  }

  if (error) {
    // Check if this is a PKCE error to show iOS-specific help
    const isPKCEError = error.includes("PKCE") || error.includes("browser") || error.includes("verifier");
    
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/10 p-6">
            <h2 className="text-xl font-semibold text-[#EF4444] mb-2">Authentication Failed</h2>
            <p className="text-white/80 mb-4">{error}</p>
            
            {isPKCEError && (
              <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-lg p-4 mb-4 text-left">
                <p className="text-[#3B82F6] text-sm font-medium mb-2">📱 Using iOS or Safari?</p>
                <p className="text-white/70 text-xs mb-2">
                  Magic links sometimes don't work on iOS because email apps open links in a different browser.
                </p>
                <p className="text-white/70 text-xs">
                  <strong>Solution:</strong> Go back and enter the 6-digit code from the email instead, or use password login.
                </p>
              </div>
            )}
            
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-[#3B82F6] text-white rounded-md hover:bg-[#3B82F6]/80 transition-colors"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <LoadingSpinner text={status} size="lg" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
