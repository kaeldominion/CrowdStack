"use client";

import { useState, useEffect } from "react";
import { Section, Container, Button } from "@crowdstack/ui";
import { CheckCircle2, Calendar, MapPin, Ticket, ArrowLeft, User, PartyPopper } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { ShareButton } from "./ShareButton";
import { AddToCalendar } from "./AddToCalendar";
import { DockNav } from "./navigation/DockNav";

interface RegistrationSuccessProps {
  eventName: string;
  eventSlug: string;
  venueName?: string | null;
  venueSlug?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  qrToken: string;
  flierUrl?: string | null;
  venueAddress?: string | null;
  showPhotoEmailNotice?: boolean;
}

export function RegistrationSuccess({
  eventName,
  eventSlug,
  venueName,
  venueSlug,
  startTime,
  endTime,
  qrToken,
  flierUrl,
  venueAddress,
  showPhotoEmailNotice = false,
}: RegistrationSuccessProps) {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Get current user ID for referral tracking
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("[RegistrationSuccess] Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Generate share URL with referral tracking
  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    return `${origin}/e/${eventSlug}`;
  };

  return (
    <div className="relative min-h-screen">
      {/* Blurred Flier Background - less blur to show more detail */}
      {flierUrl ? (
        <div className="fixed inset-0 z-0">
          <Image
            src={flierUrl}
            alt=""
            fill
            className="object-cover"
            style={{
              filter: "blur(20px)",
              transform: "scale(1.1)",
              opacity: 0.7,
            }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />
        </div>
      ) : (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      )}

      {/* Navigation Bar - Use DockNav for proper logged-in navigation */}
      <DockNav />

      {/* Content */}
      <Section spacing="xl" className="relative z-10 pt-20 sm:pt-24 pb-8">
        <Container size="sm" className="flex items-center justify-center py-8">
          {/* Glassmorphism Card - more transparent */}
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl">
            
            {/* Polaroid Photo Notice - Top Right */}
            {showPhotoEmailNotice && (
              <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-32 sm:w-40 rotate-6 z-10">
                <div className="relative bg-white p-2 sm:p-2.5 shadow-2xl border-2 border-white/90 rounded-sm overflow-visible">
                  {/* Photo section */}
                  <div className="relative w-full aspect-[4/5] bg-gray-200 rounded-sm overflow-visible mb-2">
                    <div className="absolute inset-0 overflow-hidden rounded-sm">
                      <Image
                        src="/polaroid.jpg"
                        alt="Event photos"
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    </div>
                    {/* Colorful party icon - top right corner */}
                    <div className="absolute -top-[8px] -right-[8px] bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-1.5 sm:p-2 rounded-full shadow-lg animate-pulse z-20">
                      <PartyPopper className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </div>
                  {/* Text section */}
                  <div className="px-1 pb-1">
                    <p className="text-[8px] sm:text-[10px] font-medium text-gray-800 text-center leading-tight">
                      Photos coming soon!
                    </p>
                    <p className="text-[7px] sm:text-[9px] text-gray-600 text-center mt-0.5">
                      Check your emails from CrowdStack in a few days
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header with flier preview */}
            <div className="flex items-center gap-4 mb-6">
              {/* Small flier preview */}
              {flierUrl && (
                <div className="relative w-16 h-24 rounded-xl overflow-hidden shadow-xl ring-2 ring-white/20 flex-shrink-0">
                  <Image
                    src={flierUrl}
                    alt={`${eventName} flier`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              )}
              
              {/* Success icon and title */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    You're Registered!
                  </h1>
                </div>
              </div>
            </div>
            
            {/* Event Details */}
            <div className="space-y-3">
              {/* Event Name */}
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <Calendar className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50 mb-0.5">Event</p>
                  <p className="text-sm font-semibold text-white">{eventName}</p>
                </div>
              </div>

              {/* Venue */}
              {venueName && (
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <MapPin className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50 mb-0.5">Venue</p>
                    {venueSlug ? (
                      <Link href={`/v/${venueSlug}`} className="text-sm font-semibold text-white hover:text-primary transition-colors">
                        {venueName}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-white">{venueName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Start Time */}
              {startTime && (
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Calendar className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50 mb-0.5">Date & Time</p>
                    <p className="text-sm font-semibold text-white">
                      {new Date(startTime).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="mt-6 space-y-3">
              <Link href={`/e/${eventSlug}/pass?token=${qrToken}`}>
                <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
                  <Ticket className="h-5 w-5" />
                  View QR Pass
                </Button>
              </Link>
              <p className="text-xs text-white/40 text-center">
                Show your QR pass at the event entrance
              </p>
              
              {/* Add to Calendar */}
              {startTime && (
                <AddToCalendar
                  eventName={eventName}
                  startTime={startTime}
                  endTime={endTime || null}
                  description={`You're registered for ${eventName}`}
                  location={venueAddress || venueName || undefined}
                />
              )}
              
              {/* Share Button */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="w-full [&>div]:w-full [&>div>button]:w-full">
                  <ShareButton
                    title={eventName}
                    text={`Check out ${eventName}! Register now and join me.`}
                    url={getShareUrl()}
                    imageUrl={flierUrl || undefined}
                    userId={userId}
                    label="Share with Friends & Get XP"
                    compact={false}
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="mt-4 flex gap-3">
                <Link href={`/e/${eventSlug}`} className="flex-1">
                  <Button variant="secondary" size="md" className="w-full flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Event
                  </Button>
                </Link>
                <Link href="/me" className="flex-1">
                  <Button variant="secondary" size="md" className="w-full flex items-center justify-center gap-2">
                    <User className="h-4 w-4" />
                    Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
