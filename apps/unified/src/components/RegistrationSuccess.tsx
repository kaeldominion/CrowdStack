"use client";

import { Section, Container, Card, Button } from "@crowdstack/ui";
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
    <Section spacing="xl" className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
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
  );
}

