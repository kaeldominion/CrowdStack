"use client";

import { useSearchParams } from "next/navigation";
import { MobileStickyCTA } from "@/components/MobileStickyCTA";
import { useReferralUserId } from "@/components/ReferralTracker";

export function MobileStickyCTAWrapper({
  eventSlug,
  eventName,
  shareUrl,
  startDate,
  venue,
  description,
  flierUrl,
  flierVideoUrl,
}: {
  eventSlug: string;
  eventName: string;
  shareUrl: string;
  startDate: Date;
  venue?: { name: string } | null;
  description?: string | null;
  flierUrl?: string | null;
  flierVideoUrl?: string | null;
}) {
  const userId = useReferralUserId();
  const searchParams = useSearchParams();
  
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
      href={getRegisterUrl()}
      label="Register Now"
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

