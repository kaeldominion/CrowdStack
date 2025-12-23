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
  Radio,
  ArrowRight,
  Images,
} from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ParallaxBackground } from "@/components/venue/ParallaxBackground";
import { VenueMapEmbed } from "@/components/venue/VenueMapEmbed";
import { VenueScrollWrapper } from "@/components/venue/VenueScrollWrapper";
import { HeroImage } from "@/components/venue/HeroImage";
import { EventCard } from "@/components/venue/EventCard";
import { PastEventRow } from "@/components/venue/PastEventRow";
import { GoogleMapsButton } from "@/components/venue/GoogleMapsButton";
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
  if (storagePath.startsWith("http")) {
    return storagePath;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
  const result = projectRef
    ? `https://${projectRef}.supabase.co/storage/v1/object/public/venue-images/${storagePath}`
    : storagePath;
  return result;
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
  const heroImageFromGallery = gallery.find((g) => g.is_hero)?.storage_path;
  const heroImage = heroImageFromGallery || venue.cover_image_url;
  
  // Construct hero image URL
  let heroImageUrl: string | null = null;
  if (heroImage) {
    if (heroImage.startsWith('http://') || heroImage.startsWith('https://')) {
      // Already a full HTTP/HTTPS URL
      heroImageUrl = heroImage;
    } else if (heroImage.startsWith('data:')) {
      // Data URL (base64 encoded image)
      heroImageUrl = heroImage;
    } else {
      // Use getImageUrl to construct the full URL (works for both gallery and cover_image_url)
      heroImageUrl = getImageUrl(heroImage);
    }
  }

  // Group tags by type
  const tagsByType = tags.reduce((acc, tag) => {
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag.tag_value);
    return acc;
  }, {} as Record<string, string[]>);

  const hasContactInfo = venue.phone || venue.email || venue.website || venue.instagram_url;
  const hasPolicies = venue.dress_code || venue.age_restriction || venue.entry_notes;
  const hasEvents = liveEvents.length > 0 || upcomingEvents.length > 0;

  // Get flier URL from next upcoming event, or previous event if no upcoming
  const featuredEventFlier = 
    (upcomingEvents.find(e => e.flier_url)?.flier_url) ||
    (pastEvents.find(e => e.flier_url)?.flier_url) ||
    null;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Parallax blurred background from featured event flier */}
      {featuredEventFlier && <ParallaxBackground imageUrl={featuredEventFlier} />}
      
      {/* Fallback to hero image if no event flier */}
      {!featuredEventFlier && heroImageUrl && (
        <div className="fixed inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 opacity-20"
            style={{ filter: 'blur(60px)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
      )}

      <Section spacing="xl" className="pt-8 lg:pt-12 relative z-10">
        <Container size="lg">
          <VenueScrollWrapper>
            <div className="space-y-6 md:space-y-8">
            
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl">
              {heroImageUrl ? (
                <>
                  {/* Hero Image */}
                  <div className="relative aspect-[21/9] lg:aspect-[3/1]">
                    <HeroImage src={heroImageUrl} alt={venue.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    
                    {/* Share, Favorite & Maps Buttons - Top Right */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      <FavoriteButton venueId={venue.id} />
                      <ShareButton
                        title={venue.name}
                        text={venue.tagline || venue.description || undefined}
                        url={shareUrl}
                      />
                      {mapsUrl && <GoogleMapsButton mapsUrl={mapsUrl} />}
                    </div>
                  </div>
                  
                  {/* Overlay Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-10 z-10">
                    <div className="flex items-end gap-4 sm:gap-6">
                      {/* Logo */}
                      {venue.logo_url && (
                        <div className="relative h-16 w-16 sm:h-20 sm:w-20 lg:h-28 lg:w-28 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0 shadow-2xl">
                          {venue.logo_url?.toLowerCase().includes('webp') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={venue.logo_url}
                              alt={`${venue.name} logo`}
                              className="absolute inset-0 w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Image
                              src={venue.logo_url}
                              alt={`${venue.name} logo`}
                              fill
                              className="object-contain p-2"
                            />
                          )}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                          {venue.name}
                        </h1>
                        {venue.tagline && (
                          <p className="text-base sm:text-lg lg:text-xl text-white/80 mt-1 sm:mt-2 drop-shadow-md">
                            {venue.tagline}
                          </p>
                        )}
                        {/* Address */}
                        {(venue.address || venue.city || venue.state) && (
                          <div className="mt-2 flex items-start gap-2 text-sm text-white/80 drop-shadow-md">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <div>
                              {venue.address && <p>{venue.address}</p>}
                              {(venue.city || venue.state || venue.country) && (
                                <p>
                                  {[venue.city, venue.state].filter(Boolean).join(", ")}
                                  {venue.country && `, ${venue.country}`}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* No Hero Image - Simple Header */
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-12 relative">
                  {/* Share, Favorite & Maps Buttons - Top Right */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    <FavoriteButton venueId={venue.id} />
                    <ShareButton
                      title={venue.name}
                      text={venue.tagline || venue.description || undefined}
                      url={shareUrl}
                    />
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all px-3 py-2"
                        aria-label="Open in Google Maps"
                      >
                        <MapPin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    {venue.logo_url && (
                      <div className="relative h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                        {venue.logo_url?.toLowerCase().includes('webp') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={venue.logo_url}
                            alt={`${venue.name} logo`}
                            className="absolute inset-0 w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Image
                            src={venue.logo_url}
                            alt={`${venue.name} logo`}
                            fill
                            className="object-contain p-2"
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">
                        {venue.name}
                      </h1>
                      {venue.tagline && (
                        <p className="text-base sm:text-lg text-white/70 mt-2">{venue.tagline}</p>
                      )}
                      {/* Address */}
                      {(venue.address || venue.city || venue.state) && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-white/70">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <div>
                            {venue.address && <p>{venue.address}</p>}
                            {(venue.city || venue.state || venue.country) && (
                              <p>
                                {[venue.city, venue.state].filter(Boolean).join(", ")}
                                {venue.country && `, ${venue.country}`}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* Upcoming Events - Show First Below Hero */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4 md:space-y-6 pt-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Upcoming Events</h2>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                
                {/* Description */}
                {venue.description && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Info className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">About</h2>
                    </div>
                    <p className="text-white/70 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                      {venue.description}
                    </p>
                  </div>
                )}

                {/* Gallery */}
                {gallery.length > 0 && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Images className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">Gallery</h2>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      {gallery.slice(0, 8).map((image) => (
                        <div 
                          key={image.id} 
                          className="relative aspect-square rounded-xl overflow-hidden"
                        >
                          <Image
                            src={getImageUrl(image.storage_path)}
                            alt={image.caption || `${venue.name} photo`}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                            sizes="(max-width: 768px) 25vw, 25vw"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vibe Tags */}
                {Object.keys(tagsByType).length > 0 && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
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
              <div className="space-y-4 md:space-y-6">
                
                {/* Location Card with Google Maps - Hidden on mobile */}
                <div className="hidden md:block">
                  <VenueMapEmbed venue={venue} mapsUrl={mapsUrl} />
                </div>

                {/* Contact Card */}
                {hasContactInfo && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">Contact</h2>
                    </div>
                    <div className="space-y-3">
                      {venue.phone && (
                        <a 
                          href={`tel:${venue.phone}`}
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-sm sm:text-base"
                        >
                          <Phone className="h-4 w-4 text-white/40 flex-shrink-0" />
                          <span className="break-all">{venue.phone}</span>
                        </a>
                      )}
                      {venue.email && (
                        <a 
                          href={`mailto:${venue.email}`}
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-sm sm:text-base"
                        >
                          <Mail className="h-4 w-4 text-white/40 flex-shrink-0" />
                          <span className="break-all">{venue.email}</span>
                        </a>
                      )}
                      {venue.website && (
                        <a 
                          href={venue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-sm sm:text-base"
                        >
                          <Globe className="h-4 w-4 text-white/40 flex-shrink-0" />
                          <span className="truncate">{venue.website.replace(/^https?:\/\//, "")}</span>
                        </a>
                      )}
                      {venue.instagram_url && (
                        <a 
                          href={`https://instagram.com/${venue.instagram_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-sm sm:text-base"
                        >
                          <Instagram className="h-4 w-4 text-white/40 flex-shrink-0" />
                          <span>@{venue.instagram_url}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Policies Card */}
                {hasPolicies && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Policies</h2>
                    <div className="space-y-4">
                      {venue.age_restriction && (
                        <div className="flex items-start gap-3">
                          <UserCheck className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Age</p>
                            <p className="text-white/70 text-sm sm:text-base">{venue.age_restriction}</p>
                          </div>
                        </div>
                      )}
                      {venue.dress_code && (
                        <div className="flex items-start gap-3">
                          <Shirt className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Dress Code</p>
                            <p className="text-white/70 text-sm sm:text-base">{venue.dress_code}</p>
                          </div>
                        </div>
                      )}
                      {venue.entry_notes && (
                        <div className="flex items-start gap-3">
                          <Info className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Entry Notes</p>
                            <p className="text-white/70 whitespace-pre-line text-sm sm:text-base">{venue.entry_notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Events Section */}
            <div id="events" className="space-y-6 md:space-y-8 pt-4">
              
              {/* Live Events */}
              {liveEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Happening Now</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {liveEvents.map((event) => (
                      <EventCard key={event.id} event={event} isLive />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white/60">Past Events</h2>
                    <Link 
                      href={`/v/${params.venueSlug}/events`}
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                    >
                      See All Events
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {pastEvents.slice(0, 5).map((event) => (
                      <PastEventRow key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )}

              {/* No Events State */}
              {!hasEvents && pastEvents.length === 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                  <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Events Yet</h3>
                  <p className="text-white/60">
                    Check back soon for upcoming events at {venue.name}!
                  </p>
                </div>
              )}
            </div>

            </div>
          </VenueScrollWrapper>
        </Container>
      </Section>
    </div>
  );
}
