"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MobileStickyCTA } from "@/components/MobileStickyCTA";
import { useReferralUserId } from "@/components/ReferralTracker";

export function MobileStickyCTAWrapper({
  eventSlug,
  eventName,
  shareUrl,
  startDate,
  endDate,
  venue,
  description,
  flierUrl,
  flierVideoUrl,
}: {
  eventSlug: string;
  eventName: string;
  shareUrl: string;
  startDate: Date;
  endDate?: Date | null;
  venue?: { name: string } | null;
  description?: string | null;
  flierUrl?: string | null;
  flierVideoUrl?: string | null;
}) {
  const userId = useReferralUserId();
  const searchParams = useSearchParams();
  const [isRegistered, setIsRegistered] = useState(false);
  const [passUrl, setPassUrl] = useState<string | null>(null);
  
  // Calculate if event has ended
  const now = new Date();
  const isUpcoming = now < startDate;
  const isLive = now >= startDate && (!endDate || now < endDate);
  const isPast = !isUpcoming && !isLive;
  
  // Check if user is already registered
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const res = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
        const data = await res.json();
        if (data.registered) {
          setIsRegistered(true);
          setPassUrl(`/e/${eventSlug}/pass`);
        }
      } catch (error) {
        // Silently fail - just show register button
      }
    };
    checkRegistration();
  }, [eventSlug]);
  
  // Preserve ref parameter in register link
  const getRegisterUrl = () => {
    const ref = searchParams?.get("ref");
    const baseUrl = `/e/${eventSlug}/register`;
    if (ref) {
      return `${baseUrl}?ref=${encodeURIComponent(ref)}`;
    }
    return baseUrl;
  };
  
  return (
    <MobileStickyCTA
      href={isRegistered && passUrl ? passUrl : getRegisterUrl()}
      label={isPast ? "Guestlist Closed" : isRegistered ? "View Pass" : "Register Now"}
      isRegistered={isRegistered}
      isPast={isPast}
      eventName={eventName}
      shareUrl={shareUrl}
      shareTitle={eventName}
      shareText={`🎉 ${eventName}\n📅 ${startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${venue?.name ? ` @ ${venue.name}` : ""}${description ? `\n\n${description}` : ""}`}
      shareImageUrl={flierUrl || undefined}
      shareVideoUrl={flierVideoUrl || undefined}
      userId={userId}
    />
  );
}

