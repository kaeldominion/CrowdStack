"use client";

import { Section, Container, Button, Logo } from "@crowdstack/ui";
import { CheckCircle2, Calendar, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface RegistrationSuccessProps {
  eventName: string;
  eventSlug: string;
  venueName?: string | null;
  startTime?: string | null;
  qrToken: string;
  flierUrl?: string | null;
}

export function RegistrationSuccess({
  eventName,
  eventSlug,
  venueName,
  startTime,
  qrToken,
  flierUrl,
}: RegistrationSuccessProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
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

      {/* Navigation Bar */}
      <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto sm:top-4">
        <div className="flex h-12 sm:h-14 items-center gap-2 px-3 sm:px-4 md:px-6 rounded-full border border-white/20 backdrop-blur-xl bg-black/40 shadow-lg shadow-black/50">
          <Link href="/" className="flex items-center transition-all duration-300 hover:scale-105 pr-1 sm:pr-2">
            <Logo variant="full" size="sm" animated={false} className="text-white" />
          </Link>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <Link href="/me" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap px-1 sm:px-2">
            My Events
          </Link>
        </div>
      </nav>

      {/* Content */}
      <Section spacing="xl" className="relative z-10 min-h-screen pt-20 sm:pt-24">
        <Container size="sm" className="flex items-center justify-center min-h-screen py-8">
          {/* Glassmorphism Card - more transparent */}
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl">
            
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
                    <p className="text-sm font-semibold text-white">{venueName}</p>
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

            {/* CTA Button */}
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
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
