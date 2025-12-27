"use client";

/**
 * VENUE EVENT TABS
 * 
 * Tab component for venue pages showing Upcoming/Past events.
 * Uses master EventCardRow component for consistent styling.
 */

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Card } from "@crowdstack/ui";
import { EventCardRow } from "@/components/EventCardRow";

interface Event {
  id: string;
  slug: string;
  name: string;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  registration_count: number;
  requires_approval?: boolean;
  organizer?: { id: string; name: string } | null;
  venue?: { name: string; city?: string | null } | null;
}

interface VenueEventTabsProps {
  upcomingEvents: Event[];
  pastEvents: Event[];
  venueName: string;
  venueSlug: string;
}

export function VenueEventTabs({ upcomingEvents, pastEvents, venueName, venueSlug }: VenueEventTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [showAllPast, setShowAllPast] = useState(false);

  // For past events: show 20 max, with "See More" for full list
  const displayedPastEvents = showAllPast ? pastEvents : pastEvents.slice(0, 20);
  const hasMorePast = pastEvents.length > 20 && !showAllPast;

  return (
    <>
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
        <button className="tab-label tab-label-inactive opacity-50 cursor-not-allowed" disabled>
          Photos
        </button>
      </nav>

      {/* Tab Content */}
      {activeTab === "upcoming" && (
        <>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCardRow 
                  key={event.id} 
                  event={event}
                />
              ))}
            </div>
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
