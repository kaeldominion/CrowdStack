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
          } else if (exchangeError.message.includes("PKCE") || exchangeError.message.includes("verifier") || exchangeError.message.includes("same browser")) {
            // PKCE error - redirect back to registration page with error flag
            // This will trigger password fallback in TypeformSignup
            if (redirectParam) {
              const redirectUrl = new URL(redirectParam, window.location.origin);
              redirectUrl.searchParams.set("magic_link_error", "pkce");
              window.location.replace(redirectUrl.toString());
              return;
            }
            setError("Authentication failed. Please request a new magic link in the same browser.");
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

        // Determine redirect destination based on roles
        const user = data.session.user;
        let targetPath = redirectParam || "/me";

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
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <LoadingSpinner text="Redirecting..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/10 p-6">
            <h2 className="text-xl font-semibold text-[#EF4444] mb-2">Authentication Failed</h2>
            <p className="text-white/80 mb-4">{error}</p>
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
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
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
