"use client";

import { useState, useEffect } from "react";
import { Section, Container, Button } from "@crowdstack/ui";
import { CheckCircle2, Calendar, MapPin, Ticket, ArrowLeft, User, PartyPopper, Clock } from "lucide-react";
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
  tablePartyGuestId?: string | null;
  checkinCutoffEnabled?: boolean;
  checkinCutoffTimeMale?: string | null;
  checkinCutoffTimeFemale?: string | null;
  attendeeGender?: string | null;
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
  tablePartyGuestId = null,
  checkinCutoffEnabled = false,
  checkinCutoffTimeMale = null,
  checkinCutoffTimeFemale = null,
  attendeeGender = null,
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
    <div className="relative min-h-screen bg-[var(--bg-void)]">
      {/* Blurred Flier Background - theme-aware */}
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
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-void)]/30 via-[var(--bg-void)]/40 to-[var(--bg-void)]/60" />
        </div>
      ) : (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[var(--bg-void)] via-[var(--bg-raised)] to-[var(--bg-void)]" />
      )}

      {/* Navigation Bar - Use DockNav for proper logged-in navigation */}
      <DockNav />

      {/* Content */}
      <Section spacing="xl" className="relative z-10 pt-20 sm:pt-24 pb-8">
        <Container size="sm" className="flex items-center justify-center py-8">
          {/* Glassmorphism Card - theme-aware */}
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border-subtle)] shadow-2xl">
            
            {/* Polaroid Photo Notice - Top Right */}
            {showPhotoEmailNotice && (
              <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-32 sm:w-40 rotate-6 z-10">
                <div className="relative bg-[var(--bg-glass)] p-2 sm:p-2.5 shadow-2xl border-2 border-[var(--border-subtle)] rounded-sm overflow-visible backdrop-blur-sm">
                  {/* Photo section */}
                  <div className="relative w-full aspect-[4/5] bg-[var(--bg-raised)] rounded-sm overflow-visible mb-2">
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
                    <p className="text-[8px] sm:text-[10px] font-medium text-[var(--text-primary)] text-center leading-tight">
                      Photos coming soon!
                    </p>
                    <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] text-center mt-0.5">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-success)]/20 border border-[var(--accent-success)]/30">
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent-success)]" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                    You're Registered!
                  </h1>
                </div>
              </div>
            </div>
            
            {/* Event Details */}
            <div className="space-y-3">
              {/* Event Name */}
              <div className="flex items-start gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border-subtle)]">
                <Calendar className="h-5 w-5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Event</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{eventName}</p>
                </div>
              </div>

              {/* Venue */}
              {venueName && (
                <div className="flex items-start gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border-subtle)]">
                  <MapPin className="h-5 w-5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Venue</p>
                    {venueSlug ? (
                      <Link href={`/v/${venueSlug}`} className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-secondary)] transition-colors">
                        {venueName}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{venueName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Start Time */}
              {startTime && (
                <div className="flex items-start gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border-subtle)]">
                  <Calendar className="h-5 w-5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Date & Time</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
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

              {/* Check-in Cutoff Time (gender-based) */}
              {checkinCutoffEnabled && (() => {
                // Select cutoff time based on attendee gender (default to male if no gender)
                const cutoffTime = attendeeGender === 'female'
                  ? checkinCutoffTimeFemale
                  : checkinCutoffTimeMale;

                if (!cutoffTime) return null;

                return (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                    <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-500/80 mb-0.5">Check-in Closes</p>
                      <p className="text-sm font-semibold text-amber-500">
                        {(() => {
                          const [hours, minutes] = cutoffTime.split(':').map(Number);
                          const date = new Date();
                          date.setHours(hours, minutes);
                          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CTA Buttons */}
            <div className="mt-6 space-y-3">
              <Link href={`/e/${eventSlug}/pass?token=${qrToken}`}>
                <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
                  <Ticket className="h-5 w-5" />
                  View QR Pass
                </Button>
              </Link>
              <p className="text-xs text-[var(--text-muted)] text-center">
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
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
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
