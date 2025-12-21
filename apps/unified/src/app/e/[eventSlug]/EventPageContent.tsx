import Link from "next/link";
import { Container, Section, Button, Badge } from "@crowdstack/ui";
import { Calendar, MapPin, Users, Clock, ExternalLink, Info } from "lucide-react";
import Image from "next/image";
import { ShareButton } from "@/components/ShareButton";
import { EventQRCode } from "@/components/EventQRCode";
import { PromoterRequestButton } from "@/components/PromoterRequestButton";
import { CalendarButtons } from "@/components/CalendarButtons";
import { PhotoGalleryPreview } from "@/components/PhotoGalleryPreview";

// Helper to construct Google Maps URL from address
function getGoogleMapsUrl(venue: any): string | null {
  if (venue.google_maps_url) {
    return venue.google_maps_url;
  }
  // Construct search URL from address parts
  const addressParts = [venue.address, venue.city, venue.state, venue.country].filter(Boolean);
  if (addressParts.length > 0) {
    const query = encodeURIComponent(addressParts.join(", "));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  return null;
}

interface EventPageContentProps {
  event: any;
  params: { eventSlug: string };
  shareUrl: string;
  startDate: Date;
  endDate: Date | null;
  isUpcoming: boolean;
  isLive: boolean;
  isMobileFlierView?: boolean; // When true, this is inside MobileFlierExperience (mobile only)
  isScrollMode?: boolean; // When true, cards are more transparent for parallax effect
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
  isScrollMode = false,
}: EventPageContentProps) {
  // Card styles - floating transparent when there's a flier background (mobile and desktop)
  const useFloatingCards = event.flier_url;
  const cardStyle = useFloatingCards 
    ? "p-3 lg:p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl"
    : "p-3 lg:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10";
  // When inside mobile flier view, don't show desktop elements
  // When in desktop view, show full layout
  
  return (
    <>
      {/* Desktop Hero - Only show in desktop view (not mobile flier view) */}
      {!isMobileFlierView && (
      <div className="hidden lg:block">
        {event.flier_url ? (
          // Side-by-side layout: Flier left, Title only right (description in details card)
          <div className="py-8">
            <Container size="lg">
              <div className="flex items-center gap-12">
                {/* Flier on the left - 9:16 format */}
                <div className="relative w-80 aspect-[9/16] bg-black/50 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex-shrink-0">
                  <Image
                    src={event.flier_url}
                    alt={`${event.name} flier`}
                    fill
                    className="object-contain"
                    priority
                    sizes="320px"
                  />
                </div>
                {/* Title only on the right - big and bold */}
                <div className="flex-1 flex items-center">
                  <h1 className="text-6xl font-bold tracking-tight text-foreground xl:text-7xl drop-shadow-lg">
                    {event.name}
                  </h1>
                </div>
              </div>
            </Container>
          </div>
        ) : (
          // No flier - centered title only (description in details card)
          <div className="py-12">
            <Container size="lg">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-6xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl drop-shadow-lg">
                  {event.name}
                </h1>
              </div>
            </Container>
          </div>
        )}
        </div>
      )}

      <Section spacing="sm" className="pt-0">
        <Container size="lg">
          <div className="space-y-3 lg:space-y-4">
            {/* Mobile Title with Flier Preview (shown in mobile flier view after flip) */}
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
                  
                  {/* Event title only - big and bold */}
                  <div className="flex-1 min-w-0 flex items-center">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
                      {event.name}
                    </h1>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Title for events WITHOUT fliers */}
            {!isMobileFlierView && !event.flier_url && (
              <div className="lg:hidden text-center space-y-4 py-4">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-base text-foreground-muted">
                    {event.description}
                  </p>
                )}
              </div>
            )}


            {/* Event Details Card - Compact on mobile */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 ${isScrollMode ? 'scroll-snap-align-start' : ''}`}>
              <div 
                className={`lg:col-span-2 ${cardStyle}`}
                style={isScrollMode ? { scrollSnapAlign: 'start', scrollMarginTop: '1rem' } : undefined}
              >
                <div className="space-y-3 lg:space-y-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 rounded-lg bg-primary/10">
                      <Info className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                    </div>
                    <h2 className="text-lg lg:text-xl font-semibold text-foreground">Event Details</h2>
                  </div>
                  
                  {/* Description - shown in details card */}
                  {event.description && (
                    <p className="text-sm lg:text-base text-foreground-muted pl-9 lg:pl-11">
                      {event.description}
                    </p>
                  )}
                  
                  {/* Content indented to align with title text */}
                  <div className="space-y-3 lg:space-y-4 pl-9 lg:pl-11">
                    {/* Date & Time - Compact on mobile */}
                    <div className="flex items-start gap-3 lg:gap-4">
                      <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs lg:text-sm text-foreground-muted">Date & Time</div>
                        <div className="text-sm lg:text-base text-foreground font-medium">
                          {startDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          <span className="text-foreground-muted font-normal"> · </span>
                          {startDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {endDate && (
                            <span className="text-foreground-muted font-normal">
                              {` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Venue - Clickable name and address */}
                    {event.venue && (
                      <div className="flex items-start gap-3 lg:gap-4">
                        <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs lg:text-sm text-foreground-muted">Venue</div>
                          {event.venue.slug ? (
                            <Link 
                              href={`/v/${event.venue.slug}`}
                              className="text-sm lg:text-base text-foreground font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              {event.venue.name}
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </Link>
                          ) : (
                            <div className="text-sm lg:text-base text-foreground font-medium">{event.venue.name}</div>
                          )}
                          {/* Address - Clickable to Google Maps */}
                          {(event.venue.address || event.venue.city) && (() => {
                            const mapsUrl = getGoogleMapsUrl(event.venue);
                            const addressText = [
                              event.venue.address,
                              [event.venue.city, event.venue.state].filter(Boolean).join(", ")
                            ].filter(Boolean).join(" · ");
                            
                            return mapsUrl ? (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs lg:text-sm text-foreground-muted hover:text-primary transition-colors inline-flex items-center gap-1 mt-0.5"
                              >
                                {addressText}
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            ) : (
                              <div className="text-xs lg:text-sm text-foreground-muted mt-0.5">{addressText}</div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Capacity - Hidden on mobile if we have venue (to save space) */}
                    {event.capacity && (
                      <div className="hidden lg:flex items-start gap-4">
                        <Users className="h-5 w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-foreground-muted">Capacity</div>
                          <div className="text-foreground font-medium">
                            {event.registration_count || 0} registered / {event.capacity} capacity
                          </div>
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
                        </div>
                      </div>
                    )}

                    {/* Organizer - Inline on mobile */}
                    {event.organizer && (
                      <div className="flex items-center gap-2 text-xs lg:text-sm text-foreground-muted">
                        <span>Organized by</span>
                        <span className="text-foreground font-medium">{event.organizer.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Card */}
              <div 
                className={`relative ${useFloatingCards ? 'rounded-2xl backdrop-blur-xl' : 'rounded-xl backdrop-blur-md'} p-3 lg:p-4 border ${
                  isLive 
                    ? `${useFloatingCards ? 'bg-emerald-500/20' : 'bg-emerald-500/10'} border-emerald-500/30 shadow-lg shadow-emerald-500/10` 
                    : `${useFloatingCards ? 'bg-black/40 border-white/20 shadow-2xl' : 'bg-white/5 border-white/10'}`
                }`}
                style={isScrollMode ? { scrollSnapAlign: 'start', scrollMarginTop: '1rem' } : undefined}
              >
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
                      text={`🎉 ${event.name}\n📅 ${startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${event.venue?.name ? ` @ ${event.venue.name}` : ""}${event.description ? `\n\n${event.description}` : ""}`}
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

