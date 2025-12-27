"use client";

import { useState, useEffect } from "react";
import { Card } from "@crowdstack/ui";
import { Input } from "@crowdstack/ui";
import { Modal } from "@crowdstack/ui";
import { Compass, Search, Music, Calendar, MapPin, TrendingUp, Users, Filter, X } from "lucide-react";
import { EventCardCompact } from "@/components/EventCardCompact";
import { VenueCard } from "@/components/venue/VenueCard";
import { BrowseFilters, type BrowseFilters as BrowseFiltersType } from "@/components/browse/BrowseFilters";
import { FeaturedEventsCarousel } from "@/components/browse/FeaturedEventsCarousel";
import { LocationSelector } from "@/components/browse/LocationSelector";

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
  const [activeTab, setActiveTab] = useState("events");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<BrowseFiltersType>({});
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [totalVenuesCount, setTotalVenuesCount] = useState(0);
  const [allEventsTotalCount, setAllEventsTotalCount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [availableCities, setAvailableCities] = useState<{ value: string; label: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const EVENTS_PER_PAGE = 12;

  // Fetch available cities from upcoming events only
  useEffect(() => {
    async function fetchCities() {
      try {
        // Fetch all upcoming events to get cities with active events
        const res = await fetch("/api/browse/events?limit=1000");
        const data = await res.json();
        
        // Extract unique cities from events that have venue cities
        const uniqueCities = Array.from(
          new Set(
            data.events?.map((e: any) => e.venue?.city).filter(Boolean) || []
          )
        ).sort() as string[];

        setAvailableCities(
          uniqueCities.map((city) => ({ value: city, label: city }))
        );
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setCitiesLoading(false);
      }
    }
    fetchCities();
  }, []);

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

  // Fetch live events
  useEffect(() => {
    async function fetchLiveEvents() {
      try {
        const params = new URLSearchParams({ live: "true", limit: "10" });
        const res = await fetch(`/api/browse/events?${params}`);
        const data = await res.json();
        setLiveEvents(data.events || []);
      } catch (error) {
        console.error("Error fetching live events:", error);
      }
    }
    fetchLiveEvents();
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
      if (selectedLocation) {
        params.append("city", selectedLocation);
      }
      if (filters.genre) {
        params.append("genre", filters.genre);
      }
      if (filters.venue_id) {
        params.append("venue_id", filters.venue_id);
      }

      const res = await fetch(`/api/browse/events?${params}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error fetching events:", res.status, errorData);
        throw new Error(errorData.error || "Failed to fetch events");
      }
      
      const data = await res.json();
      console.log("[Browse] Fetched events:", data.events?.length || 0, "events");
      
      if (reset) {
        setAllEvents(data.events || []);
        setEventsOffset(EVENTS_PER_PAGE);
        setTotalEventsCount(data.count || data.events?.length || 0);
        setAllEventsTotalCount(data.totalCount || data.count || 0);
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
      if (selectedLocation) {
        params.append("city", selectedLocation);
      }

      const res = await fetch(`/api/browse/venues?${params}`);
      const data = await res.json();
      setVenues(data.venues || []);
      setTotalVenuesCount(data.count || data.venues?.length || 0);
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setVenuesLoading(false);
    }
  };

  // Fetch events when search, filters, or location changes
  useEffect(() => {
    if (activeTab === "events") {
      fetchEvents(true);
    }
  }, [searchQuery, filters, selectedLocation, activeTab]);

  // Fetch venues when search or location changes
  useEffect(() => {
    if (activeTab === "djs-venues") {
      fetchVenues();
    }
  }, [searchQuery, selectedLocation, activeTab]);

  const handleLoadMore = () => {
    fetchEvents(false);
  };

  // Calculate stats from loaded events (approximate)
  const upcomingEventsThisWeek = allEvents.filter((event) => {
    const eventDate = new Date(event.start_time);
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(now.getDate() + 7);
    return eventDate >= now && eventDate <= weekFromNow;
  }).length;

  const uniqueCities = new Set(
    allEvents
      .map((e) => e.venue?.city)
      .filter(Boolean) as string[]
  ).size;

  // Use total count from API for accurate total
  const displayTotalCount = allEventsTotalCount || totalEventsCount;

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary mb-4">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="page-title mb-2">Browse Events</h1>
          <p className="text-secondary text-sm md:text-base max-w-md mx-auto mb-4">
            Discover upcoming events, parties, and experiences near you
          </p>
          
          {/* Prominent Location Selector */}
          <div className="flex justify-center">
            <LocationSelector
              value={selectedLocation}
              onChange={setSelectedLocation}
              cities={availableCities}
              loading={citiesLoading}
            />
          </div>
        </div>

        {/* Search Bar with Mobile Filter Button */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <Input
              type="text"
              placeholder="Search events, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>
          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowFiltersModal(true)}
            className="lg:hidden relative flex items-center justify-center w-12 h-12 rounded-xl bg-glass border border-border-subtle hover:border-accent-primary/50 transition-all"
            aria-label="Open filters"
          >
            <Filter className="h-5 w-5 text-primary" />
            {Object.keys(filters).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Desktop Only */}
          <aside className="lg:w-80 flex-shrink-0 space-y-6">
            {/* Filters */}
            <Card>
              <div className="space-y-4">
                <h3 className="section-header">Filters</h3>
                <BrowseFilters filters={filters} onChange={setFilters} />
              </div>
            </Card>

            {/* Stats Summary - Desktop Only */}
            {activeTab === "events" && (
              <Card className="hidden lg:block">
                <div className="space-y-4">
                  <h3 className="section-header">Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-raised border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-accent-secondary" />
                        <span className="text-sm text-secondary">Total Events</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{displayTotalCount}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-raised border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-accent-primary" />
                        <span className="text-sm text-secondary">This Week</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{upcomingEventsThisWeek}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-raised border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-accent-success" />
                        <span className="text-sm text-secondary">Cities</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{uniqueCities}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === "djs-venues" && (
              <Card className="hidden lg:block">
                <div className="space-y-4">
                  <h3 className="section-header">Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-raised border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-accent-secondary" />
                        <span className="text-sm text-secondary">Total Venues</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{totalVenuesCount}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Tabs - Design System Style */}
            <nav className="flex gap-6 border-b border-border-subtle mb-6">
              <button
                onClick={() => setActiveTab("events")}
                className={`tab-label ${activeTab === "events" ? "tab-label-active" : "tab-label-inactive"}`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab("djs-venues")}
                className={`tab-label ${activeTab === "djs-venues" ? "tab-label-active" : "tab-label-inactive"}`}
              >
                DJs & Venues
              </button>
            </nav>

            {/* EVENTS TAB */}
            {activeTab === "events" && (
              <div className="space-y-8">
                {/* Featured Events Section */}
                {featuredEvents.length > 0 && (
                  <section>
                    <h2 className="section-header mb-6">Featured</h2>
                    <FeaturedEventsCarousel events={featuredEvents} />
                  </section>
                )}

                {/* Live Events Section */}
                {liveEvents.length > 0 && (
                  <section>
                    <h2 className="section-header mb-6">Live Now</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveEvents.map((event) => (
                        <div key={event.id} className="relative">
                          {/* Glowing pulsing background */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                          <div className="relative">
                            <EventCardCompact
                              event={event}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* All Events Section */}
                <section>
                  <h2 className="section-header mb-6">All Events</h2>
                  
          {eventsLoading && allEvents.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-2xl bg-glass border border-border-subtle animate-pulse"
                >
                  <div className="w-20 sm:w-24 aspect-[9/16] rounded-xl bg-raised" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-raised rounded" />
                    <div className="h-6 w-3/4 bg-raised rounded" />
                    <div className="h-4 w-1/2 bg-raised rounded" />
                    <div className="h-10 w-36 bg-raised rounded-lg mt-auto" />
                  </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allEvents.map((event) => (
                          <EventCardCompact
                            key={event.id}
                            event={event}
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
              </div>
            )}

            {/* DJS & VENUES TAB */}
            {activeTab === "djs-venues" && (
              <div className="space-y-8">
                {/* DJs Section */}
                <section>
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

                {/* Venues Section */}
                <section>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <Modal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Filters"
        size="md"
      >
        <div className="space-y-4">
          <BrowseFilters filters={filters} onChange={setFilters} />
          <div className="flex justify-end pt-4 border-t border-border-subtle">
            <button
              onClick={() => setShowFiltersModal(false)}
              className="px-6 py-2 rounded-xl bg-accent-primary text-white font-medium hover:bg-accent-primary/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
