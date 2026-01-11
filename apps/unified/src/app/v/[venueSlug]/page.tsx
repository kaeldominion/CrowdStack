import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, Badge } from "@crowdstack/ui";
import { 
  MapPin, 
  Users, 
  Calendar,
} from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { VenueEventTabs } from "@/components/venue/VenueEventTabs";
import { MapPreview } from "@/components/venue/MapPreview";
import type { Venue, VenueGallery as VenueGalleryType, VenueTag } from "@crowdstack/shared/types";
import { formatVenueLocation } from "@/lib/utils/format-venue-location";

// Force dynamic to ensure fresh data when venue settings are updated
export const dynamic = 'force-dynamic';

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
  requires_approval?: boolean;
  registration_type?: "guestlist" | "display_only" | "external_link";
  external_ticket_url?: string | null;
}

async function getVenue(slug: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/api/venues/by-slug/${slug}`,
      { cache: 'no-store' } // Always fetch fresh data
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
  if (venue.latitude && venue.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`;
  }
  const parts = [venue.address, venue.city, venue.state, venue.country].filter(Boolean);
  if (parts.length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
  }
  return null;
}

// Format event date
// Helper to construct image URLs from storage paths
function getImageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  
  // Already a full URL
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  
  // Data URL (base64)
  if (storagePath.startsWith("data:")) {
    return storagePath;
  }
  
  // Storage path - construct full URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
  
  if (projectRef) {
    return `https://${projectRef}.supabase.co/storage/v1/object/public/venue-images/${storagePath}`;
  }
  
  return storagePath;
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
  const followerCount: number = venueData.follower_count || 0;
  const totalEventCount: number = venueData.total_event_count || 0;

  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/v/${params.venueSlug}`;
  const mapsUrl = getGoogleMapsUrl(venue);
  
  // Get hero image from venue (not event fliers)
  // Priority: gallery hero image > any gallery image > cover_image_url
  const heroImageFromGallery = gallery.find((g) => g.is_hero)?.storage_path;
  const firstGalleryImage = gallery[0]?.storage_path;
  const heroImage = getImageUrl(heroImageFromGallery) || getImageUrl(firstGalleryImage) || getImageUrl(venue.cover_image_url);

  // Group tags by type
  const musicTags = tags.filter(t => t.tag_type === "music").map(t => t.tag_value);
  const dressCodeTags = tags.filter(t => t.tag_type === "dress_code").map(t => t.tag_value);
  const crowdTypeTags = tags.filter(t => t.tag_type === "crowd_type").map(t => t.tag_value);
  const priceRangeTags = tags.filter(t => t.tag_type === "price_range").map(t => t.tag_value);
  const allTags = [...musicTags, ...dressCodeTags, ...crowdTypeTags, ...priceRangeTags];
  const hasTags = allTags.length > 0;

  // Format stats
  const formatCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const stats = {
    followers: formatCount(followerCount),
    events: totalEventCount.toString(),
  };

  return (
    <div className="min-h-screen relative">
      {/* Base background */}
      <div className="fixed inset-0 bg-void -z-20" />
      
      {/* Hero Background Image - Fades to black */}
      {heroImage && (
        <div className="fixed inset-x-0 top-0 h-[450px] z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlay - fades to void/black */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/70 to-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/30 via-transparent to-void/30" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-12 px-6 md:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto">
            
            {/* Hero Section */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6 mb-8">
            {/* Venue Logo */}
            <div className="relative h-24 w-24 lg:h-28 lg:w-28 rounded-2xl overflow-hidden bg-glass border border-border-subtle flex-shrink-0 mb-1">
              {venue.logo_url ? (
                            <Image
                              src={venue.logo_url}
                  alt={venue.name}
                              fill
                  sizes="(max-width: 1024px) 96px, 112px"
                  className="object-cover"
                            />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{venue.name[0]}</span>
                </div>
                          )}
                        </div>
                      
            {/* Venue Info - aligned to bottom of logo */}
            <div className="flex-1 pb-1">
              <h1 className="page-title">
                          {venue.name}
                        </h1>
              {formatVenueLocation({
                city: venue.city,
                state: venue.state,
                country: venue.country,
              }) && (
                <div className="flex items-center gap-1.5 text-secondary mt-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {formatVenueLocation({
                      city: venue.city,
                      state: venue.state,
                      country: venue.country,
                    })}
                  </span>
                </div>
              )}
                  </div>

            {/* Action Buttons - aligned to bottom */}
            <div className="flex items-center gap-3 pb-1">
              <FavoriteButton venueId={venue.id} variant="button" label="FOLLOW" />
                    <ShareButton
                      title={venue.name}
                      text={venue.tagline || venue.description || undefined}
                      url={shareUrl}
                iconOnly
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Sidebar */}
            <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
              
              {/* Stats Card */}
              <Card padding="none">
                <div className="grid grid-cols-2 divide-x divide-border-subtle">
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.followers}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">Followers</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.events}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">Events</p>
                  </div>
                </div>
              </Card>

              {/* About Section */}
              {(venue.description || hasTags) && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary mb-3">About</h3>
                {venue.description && (
                    <p className="text-sm text-secondary leading-relaxed">
                      {venue.description}
                    </p>
                  )}
                  
                  {/* Venue Tags */}
                  {hasTags && (
                    <div className={`flex flex-wrap gap-2 ${venue.description ? "mt-4" : ""}`}>
                      {musicTags.map((tag) => (
                        <Badge 
                          key={`music-${tag}`} 
                          color="purple" 
                          variant="outline"
                          className="!text-[10px] !font-bold !uppercase !tracking-wider"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {crowdTypeTags.map((tag) => (
                        <Badge 
                          key={`crowd-${tag}`} 
                          color="blue" 
                          variant="outline"
                          className="!text-[10px] !font-bold !uppercase !tracking-wider"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {dressCodeTags.map((tag) => (
                        <Badge 
                          key={`dress-${tag}`} 
                          color="slate" 
                          variant="outline"
                          className="!text-[10px] !font-bold !uppercase !tracking-wider"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {priceRangeTags.map((tag) => (
                        <Badge 
                          key={`price-${tag}`} 
                          color="green" 
                          variant="outline"
                          className="!text-[10px] !font-bold !uppercase !tracking-wider"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
                </div>
              )}

              {/* Location Section */}
              {mapsUrl && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary mb-3">Location</h3>
                  <MapPreview
                    lat={venue.latitude}
                    lng={venue.longitude}
                    address={venue.address}
                    city={venue.city}
                    state={venue.state}
                    country={venue.country}
                    mapsUrl={mapsUrl}
                  />
                </div>
              )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <VenueEventTabs
                liveEvents={liveEvents}
                upcomingEvents={upcomingEvents}
                pastEvents={pastEvents}
                venueName={venue.name}
                venueSlug={params.venueSlug}
                gallery={gallery}
              />
            </main>
                </div>
            </div>
            </div>
    </div>
  );
}
