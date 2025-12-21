import Link from "next/link";
import { Container, Section, Button, Card, Badge } from "@crowdstack/ui";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import Image from "next/image";
import { ShareButton } from "@/components/ShareButton";
import { EventQRCode } from "@/components/EventQRCode";
import { PromoterRequestButton } from "@/components/PromoterRequestButton";
import { CalendarButtons } from "@/components/CalendarButtons";
import { PhotoGalleryPreview } from "@/components/PhotoGalleryPreview";

interface EventPageContentProps {
  event: any;
  params: { eventSlug: string };
  shareUrl: string;
  startDate: Date;
  endDate: Date | null;
  isUpcoming: boolean;
  isLive: boolean;
  isMobileFlierView?: boolean; // When true, this is inside MobileFlierExperience (mobile only)
}

export function EventPageContent({
  event,
  params,
  shareUrl,
  startDate,
  endDate,
  isUpcoming,
  isLive,
  isMobileFlierView = false,
}: EventPageContentProps) {
  // When inside mobile flier view, don't show desktop elements
  // When in desktop view, show full layout
  
  return (
    <>
      {/* Desktop Hero - Only show in desktop view (not mobile flier view) */}
      {!isMobileFlierView && (
        <div className="hidden lg:block">
          {event.flier_url ? (
          // Single flier display with event title overlay
          <div className="bg-gradient-to-b from-black to-background py-8">
            <Container size="lg">
              <div className="flex flex-col items-center gap-6">
                {/* Flier in 9:16 format */}
                <div className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-2xl">
                  <Image
                    src={event.flier_url}
                    alt={`${event.name} flier`}
                    fill
                    className="object-contain"
                    priority
                    sizes="384px"
                  />
                </div>
                {/* Event title below flier */}
                <div className="text-center space-y-2 max-w-2xl">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {event.name}
                  </h1>
                  {event.description && (
                    <p className="text-base text-foreground-muted">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </Container>
          </div>
        ) : (
          <div className="border-b border-border bg-surface/50">
            <Container size="lg" className="py-16">
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-lg text-foreground-muted sm:text-xl">
                    {event.description}
                  </p>
                )}
              </div>
            </Container>
          </div>
        )}
        </div>
      )}

      <Section spacing="sm" className="pt-[72px] lg:pt-8">
        <Container size="lg">
          <div className="space-y-8">
            {/* Desktop: Show title if no flier */}
            {!event.flier_url && (
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-lg text-foreground-muted max-w-3xl mx-auto">
                    {event.description}
                  </p>
                )}
              </div>
            )}

            {/* Mobile Title and Flier Preview (shown in mobile flier view after flip) */}
            {isMobileFlierView && event.flier_url && (
              <div className="relative overflow-hidden rounded-2xl">
                {/* Blurred flier background */}
                <div className="absolute inset-0 -z-10">
                  <Image
                    src={event.flier_url}
                    alt=""
                    fill
                    className="object-cover blur-2xl scale-125 opacity-30"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/60" />
                </div>
                
                <div className="flex items-center gap-4 p-4">
                  {/* Small flier preview - left side */}
                  <div className="relative w-24 h-36 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ring-2 ring-white/20">
                    <Image
                      src={event.flier_url}
                      alt={`${event.name} flier`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  
                  {/* Event title and description - right side */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
                      {event.name}
                    </h1>
                    {event.description && (
                      <p className="text-sm text-foreground-muted mt-2 line-clamp-3">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* Event Details Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-foreground">Event Details</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Calendar className="h-5 w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-foreground-muted">Date & Time</div>
                        <div className="text-foreground font-medium">
                          {startDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-foreground-muted">
                          {startDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {endDate && ` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                        </div>
                      </div>
                    </div>

                    {event.venue && (
                      <div className="flex items-start gap-4">
                        <MapPin className="h-5 w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-foreground-muted">Venue</div>
                          {event.venue.slug ? (
                            <Link 
                              href={`/v/${event.venue.slug}`}
                              className="text-foreground font-medium hover:text-primary transition-colors"
                            >
                              {event.venue.name}
                            </Link>
                          ) : (
                            <div className="text-foreground font-medium">{event.venue.name}</div>
                          )}
                          {event.venue.address && (
                            <div className="text-foreground-muted text-sm">{event.venue.address}</div>
                          )}
                          {(event.venue.city || event.venue.state) && (
                            <div className="text-foreground-muted text-sm">
                              {[event.venue.city, event.venue.state, event.venue.country]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {event.capacity && (
                      <div className="flex items-start gap-4">
                        <Users className="h-5 w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-foreground-muted">Capacity</div>
                          <div className="text-foreground font-medium">
                            {event.registration_count || 0} registered
                            {event.capacity && ` / ${event.capacity} capacity`}
                          </div>
                          {event.capacity && (
                            <div className="w-full bg-surface rounded-full h-2 mt-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    ((event.registration_count || 0) / event.capacity) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {event.organizer && (
                      <div className="flex items-start gap-4">
                        <div className="text-sm text-foreground-muted">Organized by</div>
                        <div className="text-foreground font-medium">{event.organizer.name}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Action Card */}
              <div className={`relative rounded-lg border p-6 ${
                isLive 
                  ? 'bg-gradient-to-br from-emerald-500/10 via-surface to-surface border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                  : 'bg-surface border-border'
              }`}>
                {/* Status Badge - Top Right */}
                <div className="absolute top-3 right-3">
                  {isUpcoming ? (
                    <Badge variant="default" className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      Upcoming
                    </Badge>
                  ) : isLive ? (
                    <Badge variant="success" className="flex items-center gap-1 text-xs">
                      <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">Past</Badge>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Spots left / registration count */}
                  <div className="text-center pt-2">
                    {event.capacity ? (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-foreground">
                          {event.capacity - (event.registration_count || 0)} spots left
                        </div>
                        <div className="text-sm text-foreground-muted">
                          {event.registration_count || 0} people registered
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-foreground">
                        {event.registration_count || 0} registered
                      </div>
                    )}
                  </div>

                  {/* Register Now - Desktop only */}
                  <Link href={`/e/${params.eventSlug}/register`} className="hidden lg:block">
                    <Button variant="primary" size="lg" className="w-full">
                      Register Now
                    </Button>
                  </Link>

                  {/* Share and Calendar - Same line on mobile, stacked on desktop */}
                  <div className="flex flex-row lg:flex-col gap-2">
                    <ShareButton
                      title={event.name}
                      text={event.description || undefined}
                      url={shareUrl}
                      compact={true}
                    />
                    <CalendarButtons
                      eventName={event.name}
                      startTime={event.start_time}
                      endTime={event.end_time}
                      description={event.description || undefined}
                      venue={event.venue || undefined}
                      url={shareUrl}
                      compact={true}
                    />
                  </div>

                  {/* QR Code Section - Desktop only */}
                  <div className="hidden lg:block">
                    <EventQRCode eventSlug={params.eventSlug} />
                  </div>

                  {/* Promoter Request Button */}
                  <PromoterRequestButton eventId={event.id} eventSlug={params.eventSlug} />
                </div>
              </div>
            </div>

            {/* Photo Gallery Preview */}
            <PhotoGalleryPreview
              eventSlug={params.eventSlug}
              eventId={event.id}
              eventName={event.name}
            />
          </div>
        </Container>
      </Section>

      {/* Spacer for mobile sticky CTA */}
      <div className="h-24 lg:hidden" />
    </>
  );
}

