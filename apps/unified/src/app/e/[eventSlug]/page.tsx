import Link from "next/link";
import { Container, Section, Button, Card, Badge } from "@crowdstack/ui";
import { Calendar, MapPin, Users, Clock, Image as ImageIcon, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ShareButton } from "@/components/ShareButton";
import { EventQRCode } from "@/components/EventQRCode";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

// Force dynamic rendering to prevent caching stale organizer data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEvent(slug: string) {
  try {
    const supabase = createServiceRoleClient();

    // Get published event by slug
    // Explicitly specify foreign key to ensure correct organizer join
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        organizer:organizers!events_organizer_id_fkey(id, name),
        venue:venues(id, name, slug, address, city, state, country)
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return null;
    }

    // Get registration count
    const { count: registrationCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    return {
      ...event,
      registration_count: registrationCount || 0,
    };
  } catch (error) {
    console.error("Failed to fetch event:", error);
    return null;
  }
}

export default async function EventPage({
  params,
}: {
  params: { eventSlug: string };
}) {
  const event = await getEvent(params.eventSlug);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/e/${params.eventSlug}`
    : `/e/${params.eventSlug}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Cover Image */}
      {event.cover_image_url && (
        <div className="relative h-96 w-full overflow-hidden">
          <Image
            src={event.cover_image_url}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <Section spacing="xl">
        <Container size="lg">
          <div className="space-y-8">
            {/* Header */}
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
                  </div>

                  {/* QR Code Section */}
                  <EventQRCode eventSlug={params.eventSlug} />

                  {/* Event Status Badge */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-center gap-2">
                      {new Date() < startDate ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Upcoming
                        </Badge>
                      ) : new Date() > startDate && (!endDate || new Date() < endDate) ? (
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

            {/* Photo Gallery Section */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Event Photos</h2>
                    <p className="text-sm text-foreground-muted mt-1">
                      View photos from this event
                    </p>
                  </div>
                </div>
                <Link href={`/p/${params.eventSlug}`}>
                  <Button variant="primary">
                    View Gallery
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </Container>
      </Section>
    </div>
  );
}

