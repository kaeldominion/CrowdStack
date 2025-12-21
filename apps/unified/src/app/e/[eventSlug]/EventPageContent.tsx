import Link from "next/link";
import { Container, Section, Button, Card, Badge } from "@crowdstack/ui";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import Image from "next/image";
import { ShareButton } from "@/components/ShareButton";
import { EventQRCode } from "@/components/EventQRCode";
import { PromoterRequestButton } from "@/components/PromoterRequestButton";
import { CalendarButtons } from "@/components/CalendarButtons";
import { FlierGallery } from "@/components/FlierGallery";
import { PhotoGalleryPreview } from "@/components/PhotoGalleryPreview";
import { MobileStickyCTA } from "@/components/MobileStickyCTA";

interface EventPageContentProps {
  event: any;
  params: { eventSlug: string };
  shareUrl: string;
  startDate: Date;
  endDate: Date | null;
  isUpcoming: boolean;
  isLive: boolean;
}

export function EventPageContent({
  event,
  params,
  shareUrl,
  startDate,
  endDate,
  isUpcoming,
  isLive,
}: EventPageContentProps) {
  return (
    <>
      {/* Desktop Hero - Hide on mobile if flier exists (mobile will show flier first) */}
      <div className="hidden lg:block">
        {event.cover_image_url || event.flier_url ? (
          <div className="relative h-[60vh] min-h-[400px] max-h-[600px] w-full overflow-hidden">
            <Image
              src={event.cover_image_url || event.flier_url || ""}
              alt={event.name}
              fill
              className={event.flier_url ? "object-contain bg-black" : "object-cover"}
              priority
              sizes="100vw"
            />
            {/* Enhanced gradient overlay - only show if not flier */}
            {!event.flier_url && (
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 via-background/30 to-transparent" />
            )}
            
            {/* Content overlay - positioned at bottom, only if not flier */}
            {!event.flier_url && (
              <div className="absolute inset-0 flex flex-col justify-end">
                <Container size="lg" className="pb-12 pt-24">
                  <div className="max-w-3xl space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                      {event.name}
                    </h1>
                    {event.description && (
                      <p className="text-lg text-white/90 max-w-2xl drop-shadow-md sm:text-xl">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-white/90">
                      <Calendar className="h-5 w-5" />
                      <div>
                        <div className="font-medium">
                          {startDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-white/80">
                          {startDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {endDate && ` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </Container>
              </div>
            )}
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

      {/* Desktop Flier Display - 9:16 format */}
      {event.flier_url && (
        <div className="hidden lg:block bg-black py-8">
          <Container size="lg">
            <div className="flex justify-center">
              <div className="relative w-full max-w-sm aspect-[9/16] bg-white rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={event.flier_url}
                  alt={`${event.name} flier`}
                  fill
                  className="object-contain"
                  sizes="384px"
                />
              </div>
            </div>
          </Container>
        </div>
      )}

      <Section spacing="xl">
        <Container size="lg">
          <div className="space-y-8">
            {/* Desktop: Show title if no hero image */}
            {!event.cover_image_url && !event.flier_url && (
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

            {/* Mobile Title (if flier exists, shown after flip) */}
            {event.flier_url && (
              <div className="lg:hidden text-center space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-base text-foreground-muted">
                    {event.description}
                  </p>
                )}
              </div>
            )}

            {/* Desktop Flier Gallery */}
            {(event.flier_url || event.cover_image_url) && (
              <div className="hidden lg:block space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Event Images</h2>
                <FlierGallery
                  flierUrl={event.flier_url}
                  coverImageUrl={event.cover_image_url}
                  eventName={event.name}
                />
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
              <Card>
                <div className="space-y-4">
                  <div className="text-center space-y-4">
                    <div>
                      {event.capacity ? (
                        <div className="space-y-2">
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

                    <Link href={`/e/${params.eventSlug}/register`} className="block">
                      <Button variant="primary" size="lg" className="w-full">
                        Register Now
                      </Button>
                    </Link>

                    <ShareButton
                      title={event.name}
                      text={event.description || undefined}
                      url={shareUrl}
                    />

                    {/* Calendar Buttons */}
                    <CalendarButtons
                      eventName={event.name}
                      startTime={event.start_time}
                      endTime={event.end_time}
                      description={event.description || undefined}
                      venue={event.venue || undefined}
                      url={shareUrl}
                    />
                  </div>

                  {/* QR Code Section */}
                  <EventQRCode eventSlug={params.eventSlug} />

                  {/* Promoter Request Button */}
                  <PromoterRequestButton eventId={event.id} eventSlug={params.eventSlug} />

                  {/* Event Status Badge */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-center gap-2">
                      {isUpcoming ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Upcoming
                        </Badge>
                      ) : isLive ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          Live Now
                        </Badge>
                      ) : (
                        <Badge variant="default">Past Event</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
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

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        href={`/e/${params.eventSlug}/register`}
        label="Register Now"
        eventName={event.name}
      />
    </>
  );
}

