"use client";

/**
 * VENUE EVENT TABS
 * 
 * Tab component for venue pages showing Live/Upcoming/Past events.
 * Uses master EventCardRow component for consistent styling.
 */

import { useState } from "react";
import Link from "next/link";
import { Calendar, Radio } from "lucide-react";
import { Card, Badge } from "@crowdstack/ui";
import { EventCardRow } from "@/components/EventCardRow";
import { EventCard as VenueEventCard } from "@/components/venue/EventCard";
import { EventCardCompact } from "@/components/EventCardCompact";

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
  registration_count: number;
  requires_approval?: boolean;
  registration_type?: "guestlist" | "display_only" | "external_link";
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
}

export function VenueEventTabs({ liveEvents = [], upcomingEvents, pastEvents, venueName, venueSlug }: VenueEventTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
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
        <Link
          href={`/v/${venueSlug}/photos`}
          className={`tab-label tab-label-inactive`}
        >
          Photos
        </Link>
      </nav>

      {/* Tab Content */}
      {activeTab === "upcoming" && (
        <>
          {upcomingEvents.length > 0 ? (
            <>
              {/* Desktop: Full format cards in grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                  <VenueEventCard 
                    key={event.id} 
                    event={{
                      id: event.id,
                      slug: event.slug,
                      name: event.name,
                      description: event.description || null,
                      start_time: event.start_time,
                      end_time: event.end_time,
                      cover_image_url: event.cover_image_url,
                      flier_url: event.flier_url,
                      capacity: event.capacity ?? null,
                      registration_count: event.registration_count,
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
    </>
  );
}
