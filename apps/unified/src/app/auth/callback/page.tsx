"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { createClient } from "@supabase/supabase-js";

// Create a matching Supabase client for PKCE exchange
// Must use the same configuration as the login page
function createMagicLinkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // We handle this manually
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
}

/**
 * Client-side auth callback page
 * This page handles the magic link callback by exchanging the code for a session
 * using the browser client, which has access to localStorage where the
 * PKCE code_verifier is stored.
 */
export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    let cancelled = false;
    
    const handleCallback = async () => {
      if (cancelled) return;
      
      const code = searchParams.get("code");
      const redirectParam = searchParams.get("redirect");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");


      // Handle errors from Supabase
      if (errorParam) {
        console.error("[Auth Callback Client] Error from Supabase:", errorParam, errorDescription);
        setError(errorDescription || errorParam);
        return;
      }

      if (!code) {
        console.error("[Auth Callback Client] No code provided");
        setError("No authorization code provided");
        return;
      }

      try {
        setStatus("Exchanging code for session...");
        
        const supabase = createMagicLinkClient();
        
        // NOTE: We do NOT sign out before exchangeCodeForSession because that would
        // clear the PKCE code verifier from localStorage which we need for the exchange.
        // The exchange will establish the NEW session for the user who clicked the magic link.
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("[Auth Callback] Exchange error:", exchangeError.message);
          
          if (exchangeError.message.includes("already been used") || exchangeError.message.includes("expired")) {
            setError("This magic link has already been used or has expired. Please request a new one.");
          } else if (exchangeError.message.includes("PKCE") || exchangeError.message.includes("verifier")) {
            setError("Authentication failed. Please request a new magic link in the same browser.");
          } else {
            setError(`Authentication failed: ${exchangeError.message}`);
          }
          return;
        }

        if (!data.session) {
          console.error("[Auth Callback Client] No session returned");
          setError("Failed to create session");
          return;
        }

        console.log("[Auth Callback Client] Session created for:", data.session.user?.email);
        setStatus("Session created! Setting cookies...");
        
        // IMPORTANT: Set the custom cookie format that the server-side expects
        // The magic link client uses localStorage, but the server needs cookies
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
        const cookieName = `sb-${projectRef}-auth-token`;
        
        // Create the cookie value in the format the server expects
        const cookieValue = JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user,
        });
        
        // Set the cookie (expires when browser closes, or use session expiry)
        const expiresAt = data.session.expires_at ? new Date(data.session.expires_at * 1000) : undefined;
        const cookieOptions = expiresAt 
          ? `; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
          : `; path=/; SameSite=Lax`;
        document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}${cookieOptions}`;
        
        console.log("[Auth Callback Client] Custom cookie set for server-side auth");
        setStatus("Redirecting...");

        // Get user roles to determine redirect destination
        const user = data.session.user;
        let targetPath = redirectParam || "/me";

        if (user) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          if (roles && roles.length > 0) {
            const roleNames = roles.map((r: any) => r.role);
            console.log("[Auth Callback Client] User roles:", roleNames);

            // B2B roles go to app
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

        // Use redirectParam if it was specifically provided (e.g., from middleware)
        if (redirectParam && (redirectParam.startsWith("/app") || redirectParam.startsWith("/admin") || redirectParam.startsWith("/door"))) {
          targetPath = redirectParam;
        }

        console.log("[Auth Callback Client] Redirecting to:", targetPath);
        
        // Small delay to ensure session cookies are fully set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use window.location for full page reload to ensure cookies are read
        window.location.href = targetPath;
      } catch (err: any) {
        console.error("[Auth Callback Client] Unexpected error:", err);
        setError(err.message || "An unexpected error occurred");
      }
    };

    handleCallback();
    
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

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
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mx-auto mb-4"></div>
        <p className="text-white/60">{status}</p>
      </div>
    </div>
  );
}

