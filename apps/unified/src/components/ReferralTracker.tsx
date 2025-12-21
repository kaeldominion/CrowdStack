"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";

interface ReferralContextType {
  userId: string | undefined;
}

const ReferralContext = createContext<ReferralContextType>({ userId: undefined });

export function useReferralUserId() {
  return useContext(ReferralContext).userId;
}

interface ReferralTrackerProps {
  eventId: string;
  children: React.ReactNode;
}

export function ReferralTracker({ eventId, children }: ReferralTrackerProps) {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [clickTracked, setClickTracked] = useState(false);

  useEffect(() => {
    // Get current user ID
    const loadUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("[ReferralTracker] Error loading user:", error);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    // Track click if ?ref= is present in URL
    const refParam = searchParams?.get("ref");
    if (refParam && eventId && !clickTracked) {
      const trackClick = async () => {
        try {
          await fetch("/api/referral/track-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId,
              referrerUserId: refParam,
            }),
          });
          setClickTracked(true);
          // Store ref in sessionStorage for registration flow
          if (typeof window !== "undefined") {
            sessionStorage.setItem("referral_ref", refParam);
          }
        } catch (error) {
          console.error("[ReferralTracker] Error tracking click:", error);
        }
      };

      trackClick();
    }
  }, [searchParams, eventId, clickTracked]);

  return (
    <ReferralContext.Provider value={{ userId }}>
      {children}
    </ReferralContext.Provider>
  );
}

