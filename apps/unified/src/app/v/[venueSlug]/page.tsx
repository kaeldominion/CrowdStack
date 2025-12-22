import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container, Section, Button, Badge } from "@crowdstack/ui";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  ExternalLink, 
  Instagram,
  Globe,
  Phone,
  Mail,
  Shirt,
  UserCheck,
  Info,
  ChevronRight,
  Radio
} from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import type { Venue, VenueGallery as VenueGalleryType, VenueTag } from "@crowdstack/shared/types";

interface VenueEvent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  capacity: number | null;
  registration_count: number;
  organizer: { id: string; name: string } | null;
}

async function getVenue(slug: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/api/venues/by-slug/${slug}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.venue;
  } catch (error) {
    console.error("Failed to fetch venue:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { venueSlug: string };
}): Promise<Metadata> {
  const venue = await getVenue(params.venueSlug);
  
  if (!venue) {
    return { title: "Venue Not Found" };
  }

  return {
    title: `${venue.name} | CrowdStack`,
    description: venue.description || venue.tagline || `Events at ${venue.name}`,
    openGraph: {
      title: venue.name,
      description: venue.description || venue.tagline || `Events at ${venue.name}`,
      images: venue.cover_image_url ? [venue.cover_image_url] : [],
    },
  };
}

// Helper to get Google Maps URL
function getGoogleMapsUrl(venue: Venue): string | null {
  if (venue.google_maps_url) return venue.google_maps_url;
  const parts = [venue.address, venue.city, venue.state, venue.country].filter(Boolean);
  if (parts.length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
  }
  return null;
}

// Helper to construct image URLs
function getImageUrl(storagePath: string): string {
  if (storagePath.startsWith("http")) return storagePath;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
  return projectRef
    ? `https://${projectRef}.supabase.co/storage/v1/object/public/venue-images/${storagePath}`
    : storagePath;
}

// Event card component
function EventCard({ event, isLive = false }: { event: VenueEvent; isLive?: boolean }) {
  const startDate = new Date(event.start_time);
  const imageUrl = event.flier_url || event.cover_image_url;
  
  return (
    <Link href={`/e/${event.slug}`} className="group block">
      <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300">
        {/* Image */}
        {imageUrl && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Live badge */}
            {isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE NOW
              </div>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors line-clamp-1">
            {event.name}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {startDate.toLocaleDateString("en-US", { 
                  weekday: "short", 
                  month: "short", 
                  day: "numeric" 
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {startDate.toLocaleTimeString("en-US", { 
                  hour: "numeric", 
                  minute: "2-digit" 
                })}
              </span>
            </div>
          </div>
          
          {event.registration_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-white/40">
              <Users className="h-3.5 w-3.5" />
              <span>{event.registration_count} registered</span>
            </div>
          )}
        </div>
        
        {/* Arrow indicator */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Link>
  );
}

export default async function VenuePage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const venueData = await getVenue(params.venueSlug);

  if (!venueData) {
    notFound();
  }

  const venue: Venue = venueData;
  const gallery: VenueGalleryType[] = venueData.gallery || [];
  const tags: VenueTag[] = venueData.tags || [];
  const liveEvents: VenueEvent[] = venueData.live_events || [];
  const upcomingEvents: VenueEvent[] = venueData.upcoming_events || [];
  const pastEvents: VenueEvent[] = venueData.past_events || [];

  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/v/${params.venueSlug}`;
  const mapsUrl = getGoogleMapsUrl(venue);
  
  // Get hero image from gallery or cover image
  const heroImage = gallery.find((g) => g.is_hero)?.storage_path || venue.cover_image_url;
  const heroImageUrl = heroImage ? getImageUrl(heroImage) : null;

  // Group tags by type
  const tagsByType = tags.reduce((acc, tag) => {
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag.tag_value);
    return acc;
  }, {} as Record<string, string[]>);

  const hasContactInfo = venue.phone || venue.email || venue.website || venue.instagram_url;
  const hasPolicies = venue.dress_code || venue.age_restriction || venue.entry_notes;
  const hasEvents = liveEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Blurred background from hero image */}
      {heroImageUrl && (
        <div className="fixed inset-0 -z-10">
          <Image
            src={heroImageUrl}
            alt=""
            fill
            className="object-cover blur-3xl scale-110 opacity-20"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
      )}

      <Section spacing="xl" className="pt-8 lg:pt-12">
        <Container size="lg">
          <div className="space-y-8">
            
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl">
              {heroImageUrl ? (
                <>
                  {/* Hero Image */}
                  <div className="relative aspect-[21/9] lg:aspect-[3/1]">
                    <Image
                      src={heroImageUrl}
                      alt={venue.name}
                      fill
                      className="object-cover"
                      priority
                      sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  </div>
                  
                  {/* Overlay Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
                    <div className="flex items-end gap-6">
                      {/* Logo */}
                      {venue.logo_url && (
                        <div className="relative h-20 w-20 lg:h-28 lg:w-28 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0 shadow-2xl">
                          <Image
                            src={venue.logo_url}
                            alt={`${venue.name} logo`}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                          {venue.name}
                        </h1>
                        {venue.tagline && (
                          <p className="text-lg lg:text-xl text-white/80 mt-2 drop-shadow-md">
                            {venue.tagline}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* No Hero Image - Simple Header */
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 lg:p-12">
                  <div className="flex items-center gap-6">
                    {venue.logo_url && (
                      <div className="relative h-20 w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                        <Image
                          src={venue.logo_url}
                          alt={`${venue.name} logo`}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    )}
                    <div>
                      <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
                        {venue.name}
                      </h1>
                      {venue.tagline && (
                        <p className="text-lg text-white/70 mt-2">{venue.tagline}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {hasEvents && (
                <Button variant="primary" size="lg" href="#events">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Events
                </Button>
              )}
              {mapsUrl && (
                <Button variant="secondary" size="lg" href={mapsUrl} target="_blank">
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              )}
              <ShareButton
                title={venue.name}
                text={venue.tagline || venue.description || undefined}
                url={shareUrl}
                label="Share"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Description */}
                {venue.description && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Info className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">About</h2>
                    </div>
                    <p className="text-white/70 leading-relaxed whitespace-pre-line">
                      {venue.description}
                    </p>
                  </div>
                )}

            {/* Gallery */}
            {gallery.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Gallery</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {gallery.slice(0, 6).map((image, index) => (
                        <div 
                          key={image.id} 
                          className={`relative aspect-square rounded-xl overflow-hidden ${
                            index === 0 ? "md:col-span-2 md:row-span-2" : ""
                          }`}
                        >
                          <Image
                            src={getImageUrl(image.storage_path)}
                            alt={image.caption || `${venue.name} photo`}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vibe Tags */}
                {Object.keys(tagsByType).length > 0 && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">The Vibe</h2>
                    <div className="space-y-4">
                      {tagsByType.music && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Music</p>
                          <div className="flex flex-wrap gap-2">
                            {tagsByType.music.map((tag) => (
                              <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {tagsByType.crowd_type && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Crowd</p>
                          <div className="flex flex-wrap gap-2">
                            {tagsByType.crowd_type.map((tag) => (
                              <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {tagsByType.price_range && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Price Range</p>
                          <div className="flex flex-wrap gap-2">
                            {tagsByType.price_range.map((tag) => (
                              <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                
                {/* Location Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Location</h2>
                  </div>
                  
                  <div className="space-y-2 text-white/70">
                    {venue.address && <p>{venue.address}</p>}
                    <p>
                      {[venue.city, venue.state].filter(Boolean).join(", ")}
                      {venue.country && `, ${venue.country}`}
                    </p>
                  </div>
                  
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mt-4 text-sm font-medium"
                    >
                      Open in Google Maps
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Contact Card */}
                {hasContactInfo && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
                    <div className="space-y-3">
                      {venue.phone && (
                        <a 
                          href={`tel:${venue.phone}`}
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                        >
                          <Phone className="h-4 w-4 text-white/40" />
                          <span>{venue.phone}</span>
                        </a>
                      )}
                      {venue.email && (
                        <a 
                          href={`mailto:${venue.email}`}
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                        >
                          <Mail className="h-4 w-4 text-white/40" />
                          <span>{venue.email}</span>
                        </a>
                      )}
                      {venue.website && (
                        <a 
                          href={venue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                        >
                          <Globe className="h-4 w-4 text-white/40" />
                          <span className="truncate">{venue.website.replace(/^https?:\/\//, "")}</span>
                        </a>
                      )}
                      {venue.instagram_url && (
                        <a 
                          href={`https://instagram.com/${venue.instagram_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                        >
                          <Instagram className="h-4 w-4 text-white/40" />
                          <span>@{venue.instagram_url}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Policies Card */}
                {hasPolicies && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Policies</h2>
                    <div className="space-y-4">
                      {venue.age_restriction && (
                        <div className="flex items-start gap-3">
                          <UserCheck className="h-4 w-4 text-white/40 mt-0.5" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Age</p>
                            <p className="text-white/70">{venue.age_restriction}</p>
                          </div>
                        </div>
                      )}
                      {venue.dress_code && (
                        <div className="flex items-start gap-3">
                          <Shirt className="h-4 w-4 text-white/40 mt-0.5" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Dress Code</p>
                            <p className="text-white/70">{venue.dress_code}</p>
                          </div>
                        </div>
                      )}
                      {venue.entry_notes && (
                        <div className="flex items-start gap-3">
                          <Info className="h-4 w-4 text-white/40 mt-0.5" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Entry Notes</p>
                            <p className="text-white/70 whitespace-pre-line">{venue.entry_notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Events Section */}
            <div id="events" className="space-y-8 pt-4">
              
              {/* Live Events */}
              {liveEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                    <h2 className="text-2xl font-bold text-white">Happening Now</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveEvents.map((event) => (
                      <EventCard key={event.id} event={event} isLive />
                    ))}
                  </div>
                </div>
              )}

            {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Upcoming Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white/60 mb-6">Past Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                    {pastEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )}

              {/* No Events State */}
              {!hasEvents && pastEvents.length === 0 && (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
                  <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Events Yet</h3>
                  <p className="text-white/60">
                    Check back soon for upcoming events at {venue.name}!
                  </p>
                </div>
              )}
            </div>

          </div>
        </Container>
      </Section>
    </div>
  );
}
