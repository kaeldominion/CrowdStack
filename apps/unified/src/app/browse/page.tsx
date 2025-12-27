"use client";

import { useState, useEffect } from "react";
import { Card } from "@crowdstack/ui";
import { Input } from "@crowdstack/ui";
import { Compass, Search, Music, Calendar, MapPin } from "lucide-react";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { VenueCard } from "@/components/venue/VenueCard";
import { BrowseFilters, type BrowseFilters as BrowseFiltersType } from "@/components/browse/BrowseFilters";
import { FeaturedEventsCarousel } from "@/components/browse/FeaturedEventsCarousel";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  flier_url?: string | null;
  cover_image_url?: string | null;
  venue?: {
    name: string;
    city?: string | null;
  } | null;
}

interface Venue {
  id: string;
  name: string;
  slug: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  rating?: number | null;
  tags?: { tag_type: string; tag_value: string }[];
}

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<BrowseFiltersType>({});
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [eventsOffset, setEventsOffset] = useState(0);

  const EVENTS_PER_PAGE = 12;

  // Fetch featured events
  useEffect(() => {
    async function fetchFeaturedEvents() {
      try {
        const params = new URLSearchParams({ featured: "true", limit: "6" });
        const res = await fetch(`/api/browse/events?${params}`);
        const data = await res.json();
        setFeaturedEvents(data.events || []);
      } catch (error) {
        console.error("Error fetching featured events:", error);
      }
    }
    fetchFeaturedEvents();
  }, []);

  // Fetch all events
  const fetchEvents = async (reset = false) => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(EVENTS_PER_PAGE),
        offset: String(reset ? 0 : eventsOffset),
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (filters.date) {
        params.append("date", filters.date);
      }
      if (filters.city) {
        params.append("city", filters.city);
      }
      if (filters.genre) {
        params.append("genre", filters.genre);
      }
      if (filters.venue_id) {
        params.append("venue_id", filters.venue_id);
      }

      const res = await fetch(`/api/browse/events?${params}`);
      const data = await res.json();
      
      if (reset) {
        setAllEvents(data.events || []);
        setEventsOffset(EVENTS_PER_PAGE);
      } else {
        setAllEvents((prev) => [...prev, ...(data.events || [])]);
        setEventsOffset((prev) => prev + EVENTS_PER_PAGE);
      }
      
      setHasMoreEvents((data.events || []).length === EVENTS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setEventsLoading(false);
      setLoading(false);
    }
  };

  // Fetch venues
  const fetchVenues = async () => {
    setVenuesLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "12",
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (filters.city) {
        params.append("city", filters.city);
      }

      const res = await fetch(`/api/browse/venues?${params}`);
      const data = await res.json();
      setVenues(data.venues || []);
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setVenuesLoading(false);
    }
  };

  // Fetch events when search or filters change
  useEffect(() => {
    fetchEvents(true);
  }, [searchQuery, filters]);

  // Fetch venues when search or city filter changes
  useEffect(() => {
    fetchVenues();
  }, [searchQuery, filters.city]);

  const handleLoadMore = () => {
    fetchEvents(false);
  };

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary mb-4">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="page-title mb-2">Browse Events</h1>
          <p className="text-secondary text-sm md:text-base max-w-md mx-auto">
            Discover upcoming events, parties, and experiences near you
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <Input
              type="text"
              placeholder="Search events, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <BrowseFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Featured Events Section */}
        {featuredEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="section-header mb-6">Featured</h2>
            <FeaturedEventsCarousel events={featuredEvents} />
          </section>
        )}

        {/* All Events Section */}
        <section className="mb-12">
          <h2 className="section-header mb-6">All Events</h2>
          
          {eventsLoading && allEvents.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl overflow-hidden border border-border-subtle bg-void animate-pulse"
                >
                  <div className="aspect-[3/4] min-h-[380px] bg-raised" />
                </div>
              ))}
            </div>
          ) : allEvents.length === 0 ? (
            <Card className="!border-dashed !p-12 text-center">
              <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                No events found
              </h3>
              <p className="text-sm text-secondary">
                Try adjusting your search or filters to find more events.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allEvents.map((event) => (
                  <AttendeeEventCard
                    key={event.id}
                    event={event}
                    variant="default"
                  />
                ))}
              </div>

              {hasMoreEvents && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={eventsLoading}
                    className="px-6 py-3 rounded-xl bg-glass border border-border-subtle text-primary font-medium hover:border-accent-primary/50 hover:bg-glass/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {eventsLoading ? "Loading..." : "Load More Events"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Venues Section */}
        <section className="mb-12">
          <h2 className="section-header mb-6">Venues</h2>
          
          {venuesLoading && venues.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl overflow-hidden border border-border-subtle bg-void animate-pulse"
                >
                  <div className="h-[400px] bg-raised" />
                </div>
              ))}
            </div>
          ) : venues.length === 0 ? (
            <Card className="!border-dashed !p-12 text-center">
              <MapPin className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                No venues found
              </h3>
              <p className="text-sm text-secondary">
                Try adjusting your search or filters to find more venues.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  showRating
                  showTags
                  layout="portrait"
                />
              ))}
            </div>
          )}
        </section>

        {/* DJs Coming Soon Section */}
        <section className="mb-12">
          <h2 className="section-header mb-6">DJs</h2>
          <Card className="!border-dashed !p-12 text-center">
            <Music className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">
              Coming Soon
            </h3>
            <p className="text-sm text-secondary">
              Browse and discover DJs will be available soon.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
