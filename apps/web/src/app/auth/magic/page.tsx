"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";

/**
 * Simple magic link callback - just get it working to /me
 */
export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const supabase = createBrowserClient();
        
        // Get code and redirect from URL
        const code = searchParams.get("code");
        const redirect = searchParams.get("redirect");
        const errorParam = searchParams.get("error");
        
        if (errorParam) {
          setError("Invalid or expired magic link");
          setLoading(false);
          return;
        }

        if (!code) {
          setError("No authorization code provided");
          setLoading(false);
          return;
        }

        // Exchange code for session (browser has access to PKCE cookies)
        const { data: { session: newSession }, error: exchangeError } = 
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError || !newSession) {
          setError(exchangeError?.message || "Failed to authenticate");
          setLoading(false);
          return;
        }

        // Get session with tokens for cross-port sharing
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("Failed to get session after authentication");
          setLoading(false);
          return;
        }

        // Get user and check role for redirect
        const { data: { user } } = await supabase.auth.getUser();
        
        // App URL for cross-port redirects
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";
        
        // Determine if we need to redirect to app (port 3007)
        const isRedirectingToApp = redirect?.includes("localhost:3007") || redirect?.includes("3007");
        
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
          // Extract path from redirect (could be full URL or just path)
          let finalPath = targetPath;
          if (redirect) {
            try {
              finalPath = new URL(redirect).pathname;
            } catch {
              finalPath = redirect;
            }
          }
          
          const sessionUrl = new URL("/api/auth/session", appUrl);
          sessionUrl.searchParams.set("access_token", session.access_token);
          sessionUrl.searchParams.set("refresh_token", session.refresh_token);
          sessionUrl.searchParams.set("redirect", finalPath);
          window.location.replace(sessionUrl.toString());
          return;
        }
        
        // For web-only routes (attendee dashboard)
        if (redirect && !redirect.includes("localhost:3007")) {
          window.location.replace(redirect);
        } else {
          window.location.replace("/me");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setLoading(false);
      }
    };

    handleMagicLink();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Verifying magic link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-4">Error</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <a
            href="/login"
            className="text-[#3B82F6] hover:text-[#3B82F6]/80"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return null;
}

