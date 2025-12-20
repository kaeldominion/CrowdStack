"use client";

import { Section, Container, Card, Button, Logo } from "@crowdstack/ui";
import { CheckCircle2, Calendar, MapPin, Ticket } from "lucide-react";
import Link from "next/link";

interface RegistrationSuccessProps {
  eventName: string;
  eventSlug: string;
  venueName?: string | null;
  startTime?: string | null;
  qrToken: string;
}

export function RegistrationSuccess({
  eventName,
  eventSlug,
  venueName,
  startTime,
  qrToken,
}: RegistrationSuccessProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
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

      <Section spacing="xl" className="min-h-screen pt-20 sm:pt-24">
        <Container size="sm" className="flex items-center justify-center min-h-screen py-8">
        <Card className="text-center w-full max-w-md p-6 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-6">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            You're Registered!
          </h1>
          
          <div className="mt-6 space-y-4 text-left">
            {/* Event Name */}
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/60 mb-1">Event</p>
                <p className="text-base font-semibold text-white">{eventName}</p>
              </div>
            </div>

            {/* Venue */}
            {venueName && (
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/60 mb-1">Venue</p>
                  <p className="text-base font-semibold text-white">{venueName}</p>
                </div>
              </div>
            )}

            {/* Start Time */}
            {startTime && (
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/60 mb-1">Date & Time</p>
                  <p className="text-base font-semibold text-white">
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

          <div className="mt-8 space-y-3">
            <Link href={`/e/${eventSlug}/pass?token=${qrToken}`}>
              <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
                <Ticket className="h-5 w-5" />
                View QR Pass
              </Button>
            </Link>
            <p className="text-xs text-white/50">
              Show your QR pass at the event entrance
            </p>
          </div>
        </Card>
      </Container>
    </Section>
    </div>
  );
}

