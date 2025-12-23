"use client";

import { useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_WEBSITE_ID = "1fa3f55e-0efd-45e0-a8a8-8ad6373b1388";

// Get environment for tagging conversations
function getEnvironment(): "production" | "beta" | "development" {
  if (typeof window === "undefined") return "development";
  
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  if (appEnv === "prod" || appEnv === "production") return "production";
  if (appEnv === "beta") return "beta";
  
  // Fallback: detect from hostname
  const hostname = window.location.hostname;
  if (hostname === "crowdstack.app" || hostname === "www.crowdstack.app") return "production";
  if (hostname === "beta.crowdstack.app") return "beta";
  
  return "development";
}

export function CrispChat() {
  const [mounted, setMounted] = useState(false);
  const loadingRef = useRef(false);
  const xpCacheRef = useRef<{ xp: number; timestamp: number } | null>(null);
  const XP_CACHE_TTL = 30000; // Cache XP for 30 seconds

  // Only run on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Don't run on server or before mount
    if (!mounted || typeof window === "undefined") return;

    // Initialize Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Configure Crisp before loading
    // Hide on mobile devices (built-in Crisp feature)
    window.$crisp.push(["config", "hide:on:mobile", [true]]);

    // Set dark mode to match app theme
    window.$crisp.push(["config", "color:mode", ["dark"]]);

    // Safe mode to prevent console errors
    window.$crisp.push(["safe", true]);

    // Load the Crisp script
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    // Load user data function
    const loadUserData = async () => {
      // Prevent concurrent calls
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        // Dynamic import to avoid SSR issues
        const { createBrowserClient } = await import("@crowdstack/shared");
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        const environment = getEnvironment();

        if (!user) {
          // No logged in user - just set anonymous segment with environment
          window.$crisp.push(["set", "session:segments", [["anonymous", `env:${environment}`]]]);
          window.$crisp.push(["set", "session:data", [[["environment", environment]]]]);
          return;
        }

        // Set email immediately
        if (user.email) {
          window.$crisp.push(["set", "user:email", [user.email]]);
        }

        // Set user nickname from metadata or email
        const displayName = user.user_metadata?.name || user.email?.split("@")[0];
        if (displayName) {
          window.$crisp.push(["set", "user:nickname", [displayName]]);
        }

        // Try to get identity verification signature (async, non-blocking)
        fetch("/api/auth/crisp-signature")
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.verified && data?.signature && data?.email) {
              // Update email with HMAC signature for identity verification
              window.$crisp.push(["set", "user:email", [data.email, data.signature]]);
            }
          })
          .catch(() => {
            // Identity verification failed, already set email without it
          });

        // Load user roles
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = userRoles?.map((r: { role: string }) => r.role) || [];

        // Load attendee profile for additional data
        const { data: attendee } = await supabase
          .from("attendees")
          .select("id, name, phone, instagram_handle")
          .eq("user_id", user.id)
          .single();

        // Set user phone if available
        if (attendee?.phone) {
          window.$crisp.push(["set", "user:phone", [attendee.phone]]);
        }

        // Load XP data - TEMPORARILY DISABLED to prevent excessive API calls
        // TODO: Re-enable with proper caching/throttling once performance issue is resolved
        let totalXp = 0;
        // const now = Date.now();
        // const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
        // 
        // if (xpCacheRef.current && (now - xpCacheRef.current.timestamp) < CACHE_DURATION) {
        //   totalXp = xpCacheRef.current.xp;
        // } else if (!xpCacheRef.current && !xpFetchInProgressRef.current) {
        //   xpFetchInProgressRef.current = true;
        //   fetch("/api/xp/me")
        //     .then((xpResponse) => xpResponse.ok ? xpResponse.json() : null)
        //     .then((xpData) => {
        //       if (xpData?.total_xp !== undefined) {
        //         xpCacheRef.current = { xp: xpData.total_xp || 0, timestamp: Date.now() };
        //       }
        //     })
        //     .catch(() => {})
        //     .finally(() => { xpFetchInProgressRef.current = false; });
        // } else if (xpCacheRef.current) {
        //   totalXp = xpCacheRef.current.xp;
        // }

        // Set session segments based on roles (for support routing)
        const segments: string[] = ["logged-in", `env:${environment}`];
        if (roles.includes("superadmin")) segments.push("superadmin");
        if (roles.includes("venue_admin")) segments.push("venue-admin");
        if (roles.includes("event_organizer")) segments.push("organizer");
        if (roles.includes("promoter")) segments.push("promoter");
        if (roles.includes("attendee") || roles.length === 0) segments.push("attendee");

        window.$crisp.push(["set", "session:segments", [segments]]);

        // Set session data for support context
        const sessionData: [string, string | number][] = [
          ["environment", environment],
          ["user_id", user.id],
          ["xp_points", totalXp],
          ["roles", roles.join(", ") || "none"],
        ];

        if (attendee?.id) {
          sessionData.push(["attendee_id", attendee.id]);
        }

        if (attendee?.instagram_handle) {
          sessionData.push(["instagram", attendee.instagram_handle]);
        }

        // Add role counts for quick reference
        sessionData.push(["role_count", roles.length]);

        window.$crisp.push(["set", "session:data", [sessionData]]);

        // If user is an organizer, try to get their organizer info
        if (roles.includes("event_organizer")) {
          try {
            const { data: orgUser } = await supabase
              .from("organizer_users")
              .select("organizer:organizers(name, company_name)")
              .eq("user_id", user.id)
              .limit(1)
              .maybeSingle();

            if (orgUser?.organizer) {
              const org = Array.isArray(orgUser.organizer) 
                ? orgUser.organizer[0] 
                : orgUser.organizer;
              if (org?.name || org?.company_name) {
                window.$crisp.push(["set", "user:company", [
                  org.company_name || org.name,
                  {
                    employment: ["Member", "Event Organizer"],
                  }
                ]]);
              }
            }
          } catch {
            // Organizer fetch failed, continue
          }
        }

        // If user is a venue admin, try to get their venue info
        if (roles.includes("venue_admin")) {
          try {
            const { data: venueUser } = await supabase
              .from("venue_users")
              .select("venue:venues(name, city, country)")
              .eq("user_id", user.id)
              .limit(1)
              .single();

            if (venueUser?.venue) {
              const venue = Array.isArray(venueUser.venue) 
                ? venueUser.venue[0] 
                : venueUser.venue;
              if (venue?.name) {
                window.$crisp.push(["set", "user:company", [
                  venue.name,
                  {
                    employment: ["Admin", "Venue Administrator"],
                    geolocation: venue.country ? [venue.country, venue.city || ""] : undefined,
                  }
                ]]);
              }
            }
          } catch {
            // Venue fetch failed, continue
          }
        }

        // Set up auth state change listener
        // Only reload on actual auth changes, not token refreshes (which happen frequently)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event) => {
            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
              // Reload user data on auth change
              loadUserData();
            }
            // Note: We skip TOKEN_REFRESHED events to prevent excessive API calls
            // User data doesn't change on token refresh, so no need to reload
          }
        );

        // Store subscription for cleanup
        return () => subscription.unsubscribe();

      } catch (error) {
        console.error("[CrispChat] Error loading user data:", error);
      } finally {
        loadingRef.current = false;
      }
    };

    // Wait for Crisp to be ready, then load user data
    let cleanupAuth: (() => void) | undefined;
    const checkCrispReady = setInterval(() => {
      if (window.$crisp && typeof window.$crisp.push === "function") {
        clearInterval(checkCrispReady);
        loadUserData().then((cleanup) => {
          if (cleanup) cleanupAuth = cleanup;
        });
      }
    }, 100);

    // Cleanup
    return () => {
      clearInterval(checkCrispReady);
      cleanupAuth?.();
    };
  }, [mounted]);

  return null;
}
