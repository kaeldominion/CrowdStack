"use client";

/**
 * VENUE EVENT TABS
 * 
 * Tab component for venue pages showing Live/Upcoming/Past events.
 * Uses master EventCardRow component for consistent styling.
 */

import { useState } from "react";
import Image from "next/image";
import { Calendar, Camera } from "lucide-react";
import { Card } from "@crowdstack/ui";
import { EventCardRow } from "@/components/EventCardRow";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { EventCardCompact } from "@/components/EventCardCompact";
import type { VenueGallery as VenueGalleryType } from "@crowdstack/shared/types";

interface Event {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  capacity?: number | null;
  max_guestlist_size?: number | null;
  registration_count: number;
  requires_approval?: boolean;
  registration_type?: "guestlist" | "display_only" | "external_link"; // Deprecated, kept for backward compatibility
  has_guestlist?: boolean;
  ticket_sale_mode?: "none" | "external" | "internal";
  is_public?: boolean;
  external_ticket_url?: string | null;
  organizer?: { id: string; name: string } | null;
  venue?: { name: string; city?: string | null } | null;
}

interface VenueEventTabsProps {
  liveEvents?: Event[];
  upcomingEvents: Event[];
  pastEvents: Event[];
  venueName: string;
  venueSlug: string;
  gallery?: VenueGalleryType[];
}

export function VenueEventTabs({ liveEvents = [], upcomingEvents, pastEvents, venueName, venueSlug, gallery = [] }: VenueEventTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "photos">("upcoming");
  const [showAllPast, setShowAllPast] = useState(false);
  
  const hasLiveEvents = liveEvents.length > 0;

  // For past events: show 20 max, with "See More" for full list
  const displayedPastEvents = showAllPast ? pastEvents : pastEvents.slice(0, 20);
  const hasMorePast = pastEvents.length > 20 && !showAllPast;

  return (
    <>
      {/* Live Events Banner - Always visible when there are live events */}
      {hasLiveEvents && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2.5 w-2.5 bg-accent-error rounded-full animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-error">
              Happening Now
            </span>
          </div>
          <div className="space-y-3">
            {liveEvents.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-accent-error rounded-full" />
                <EventCardRow 
                  event={event}
                  isLive
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex gap-6 border-b border-border-subtle mb-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`tab-label ${activeTab === "upcoming" ? "tab-label-active" : "tab-label-inactive"}`}
        >
          Upcoming Events
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`tab-label ${activeTab === "past" ? "tab-label-active" : "tab-label-inactive"}`}
        >
          Past Events
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={`tab-label ${activeTab === "photos" ? "tab-label-active" : "tab-label-inactive"}`}
        >
          Photos
        </button>
      </nav>

      {/* Tab Content */}
      {activeTab === "upcoming" && (
        <>
          {upcomingEvents.length > 0 ? (
            <>
              {/* Desktop: Full format cards in grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                  <AttendeeEventCard
                    key={event.id}
                    event={{
                      id: event.id,
                      slug: event.slug,
                      name: event.name,
                      start_time: event.start_time,
                      cover_image_url: event.cover_image_url,
                      flier_url: event.flier_url,
                      max_guestlist_size: event.max_guestlist_size ?? null,
                      registration_count: event.registration_count,
                      has_guestlist: event.has_guestlist,
                      ticket_sale_mode: event.ticket_sale_mode,
                      external_ticket_url: event.external_ticket_url,
                    }}
                  />
                ))}
              </div>
              {/* Mobile: Compact cards */}
              <div className="md:hidden space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCardCompact 
                    key={event.id} 
                    event={event}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card className="!p-8 text-center border-dashed">
              <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No upcoming events</h3>
              <p className="text-sm text-secondary">Check back soon for events at {venueName}!</p>
            </Card>
          )}
        </>
      )}

      {activeTab === "past" && (
        <>
          {pastEvents.length > 0 ? (
            <div className="space-y-3">
              {displayedPastEvents.map((event) => (
                <EventCardRow 
                  key={event.id} 
                  event={event}
                  isPast
                />
              ))}
              
              {/* See More Button */}
              {hasMorePast && (
                <button
                  onClick={() => setShowAllPast(true)}
                  className="w-full py-3 mt-4 rounded-xl bg-glass border border-border-subtle text-sm font-semibold text-primary hover:bg-active hover:border-accent-primary/30 transition-colors"
                >
                  See More Past Events
                </button>
              )}
            </div>
          ) : (
            <Card className="!p-8 text-center border-dashed">
              <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No past events yet</h3>
              <p className="text-sm text-secondary">{venueName} hasn&apos;t hosted any events yet.</p>
            </Card>
          )}
        </>
      )}

      {activeTab === "photos" && (
        <>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((image) => {
                // Construct image URL (same pattern as VenueGallery component)
                const getImageUrl = (img: VenueGalleryType) => {
                  if (img.storage_path.startsWith("http")) {
                    return img.storage_path;
                  }
                  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
                  const supabaseProjectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
                  if (supabaseProjectRef) {
                    return `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/venue-images/${img.storage_path}`;
                  }
                  return img.storage_path;
                };

                const imageUrl = getImageUrl(image);

                return (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-raised border border-border-subtle hover:border-accent-primary/50 transition-all group cursor-pointer"
                  >
                    <Image
                      src={imageUrl}
                      alt={image.caption || `Gallery image ${image.id}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                    {image.caption && (
                      <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs text-white line-clamp-2">{image.caption}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="!p-8 text-center border-dashed">
              <Camera className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No photos yet</h3>
              <p className="text-sm text-secondary">Photos from events at {venueName} will appear here.</p>
            </Card>
          )}
        </>
      )}
    </>
  );
}
