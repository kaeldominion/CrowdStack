"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@crowdstack/ui";
import { Input } from "@crowdstack/ui";
import { Compass, Search, Music, Calendar, MapPin, Radio } from "lucide-react";
import { EventCardRow } from "@/components/EventCardRow";
import { VenueCard } from "@/components/venue/VenueCard";
import { DJCard, DJCardSkeleton } from "@/components/dj/DJCard";
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
  capacity?: number | null;
  registration_count?: number;
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

interface DJ {
  id: string;
  name: string;
  handle: string;
  bio?: string | null;
  genres?: string[] | null;
  location?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
}

type TabType = "events" | "djs" | "venues" | "history";

export default function BrowsePage() {
  const [activeTab, setActiveTab] = useState<TabType>("events");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Filters per tab
  const [eventsFilters, setEventsFilters] = useState<BrowseFiltersType>({});
  const [djsFilters, setDjsFilters] = useState<BrowseFiltersType>({});
  const [venuesFilters, setVenuesFilters] = useState<BrowseFiltersType>({});
  const [historyFilters, setHistoryFilters] = useState<BrowseFiltersType>({});
  
  // Data states
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [djs, setDjs] = useState<DJ[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [djsLoading, setDjsLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [pastEventsLoading, setPastEventsLoading] = useState(false);
  
  // Pagination states
  const [eventsOffset, setEventsOffset] = useState(0);
  const [djsOffset, setDjsOffset] = useState(0);
  const [venuesOffset, setVenuesOffset] = useState(0);
  const [pastEventsOffset, setPastEventsOffset] = useState(0);
  
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [totalDjsCount, setTotalDjsCount] = useState(0);
  const [totalVenuesCount, setTotalVenuesCount] = useState(0);
  const [totalPastEventsCount, setTotalPastEventsCount] = useState(0);
  
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [hasMoreDjs, setHasMoreDjs] = useState(true);
  const [hasMoreVenues, setHasMoreVenues] = useState(true);
  const [hasMorePastEvents, setHasMorePastEvents] = useState(true);
  
  // Location
  const [selectedLocation, setSelectedLocation] = useState("");
  const [availableCities, setAvailableCities] = useState<{ value: string; label: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const ITEMS_PER_PAGE = 12;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch available cities (from events only - DJs are global)
  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch("/api/browse/events?limit=1000");
        const data = await res.json();
        
        // Get venue cities from events
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
        const res = await fetch("/api/browse/events?featured=true&limit=6");
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
        const res = await fetch("/api/browse/events?live=true&limit=10");
        const data = await res.json();
        setLiveEvents(data.events || []);
      } catch (error) {
        console.error("Error fetching live events:", error);
      }
    }
    fetchLiveEvents();
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async (reset = false) => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String(reset ? 0 : eventsOffset),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (eventsFilters.date) params.append("date", eventsFilters.date);
      if (selectedLocation) params.append("city", selectedLocation);
      if (eventsFilters.genre) params.append("genre", eventsFilters.genre);

      const res = await fetch(`/api/browse/events?${params}`);
      const data = await res.json();

      if (reset) {
        setAllEvents(data.events || []);
        setEventsOffset(ITEMS_PER_PAGE);
        setTotalEventsCount(data.totalCount || data.count || 0);
      } else {
        setAllEvents((prev) => [...prev, ...(data.events || [])]);
        setEventsOffset((prev) => prev + ITEMS_PER_PAGE);
      }
      setHasMoreEvents((data.events || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setEventsLoading(false);
      setLoading(false);
    }
  }, [debouncedSearch, eventsFilters, selectedLocation, eventsOffset]);

  // Fetch DJs
  const fetchDjs = useCallback(async (reset = false) => {
    setDjsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String(reset ? 0 : djsOffset),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (djsFilters.genre) params.append("genre", djsFilters.genre);
      // Note: DJs are not filtered by location - they perform globally

      const res = await fetch(`/api/browse/djs?${params}`);
      const data = await res.json();

      if (reset) {
        setDjs(data.djs || []);
        setDjsOffset(ITEMS_PER_PAGE);
        setTotalDjsCount(data.totalCount || data.count || 0);
      } else {
        setDjs((prev) => [...prev, ...(data.djs || [])]);
        setDjsOffset((prev) => prev + ITEMS_PER_PAGE);
      }
      setHasMoreDjs((data.djs || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching DJs:", error);
    } finally {
      setDjsLoading(false);
    }
  }, [debouncedSearch, djsFilters, djsOffset]);

  // Fetch venues
  const fetchVenues = useCallback(async (reset = false) => {
    setVenuesLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String(reset ? 0 : venuesOffset),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedLocation) params.append("city", selectedLocation);

      const res = await fetch(`/api/browse/venues?${params}`);
      const data = await res.json();

      if (reset) {
        setVenues(data.venues || []);
        setVenuesOffset(ITEMS_PER_PAGE);
        setTotalVenuesCount(data.totalCount || data.count || 0);
      } else {
        setVenues((prev) => [...prev, ...(data.venues || [])]);
        setVenuesOffset((prev) => prev + ITEMS_PER_PAGE);
      }
      setHasMoreVenues((data.venues || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setVenuesLoading(false);
    }
  }, [debouncedSearch, selectedLocation, venuesOffset]);

  // Fetch past events
  const fetchPastEvents = useCallback(async (reset = false) => {
    setPastEventsLoading(true);
    try {
      const params = new URLSearchParams({
        past: "true",
        limit: String(ITEMS_PER_PAGE),
        offset: String(reset ? 0 : pastEventsOffset),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedLocation) params.append("city", selectedLocation);
      if (historyFilters.genre) params.append("genre", historyFilters.genre);

      const res = await fetch(`/api/browse/events?${params}`);
      const data = await res.json();

      if (reset) {
        setPastEvents(data.events || []);
        setPastEventsOffset(ITEMS_PER_PAGE);
        setTotalPastEventsCount(data.totalCount || data.count || 0);
      } else {
        setPastEvents((prev) => [...prev, ...(data.events || [])]);
        setPastEventsOffset((prev) => prev + ITEMS_PER_PAGE);
      }
      setHasMorePastEvents((data.events || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching past events:", error);
    } finally {
      setPastEventsLoading(false);
    }
  }, [debouncedSearch, selectedLocation, historyFilters, pastEventsOffset]);

  // Fetch all data on search/location change (global search)
  useEffect(() => {
    fetchEvents(true);
    fetchDjs(true);
    fetchVenues(true);
    fetchPastEvents(true);
  }, [debouncedSearch, selectedLocation]);

  // Refetch tab data when filters change
  useEffect(() => {
    fetchEvents(true);
  }, [eventsFilters]);

  useEffect(() => {
    fetchDjs(true);
  }, [djsFilters]);

  useEffect(() => {
    fetchPastEvents(true);
  }, [historyFilters]);

  // Get active filter count for a tab
  const getFilterCount = (filters: BrowseFiltersType) => {
    return Object.keys(filters).filter(k => k !== 'search').length;
  };

  // Tab badge counts
  const getTabBadge = (tab: TabType) => {
    if (!debouncedSearch) return null;
    switch (tab) {
      case "events": return totalEventsCount > 0 ? totalEventsCount : null;
      case "djs": return totalDjsCount > 0 ? totalDjsCount : null;
      case "venues": return totalVenuesCount > 0 ? totalVenuesCount : null;
      case "history": return totalPastEventsCount > 0 ? totalPastEventsCount : null;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary mb-4">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="page-title mb-2">Browse</h1>
          <p className="text-secondary text-sm md:text-base max-w-md mx-auto mb-4">
            Discover events, DJs, and venues near you
          </p>
          
          {/* Location Selector - only show for Events, Venues, History (not DJs - they're global) */}
          {activeTab !== "djs" && (
            <div className="flex justify-center">
              <LocationSelector
                value={selectedLocation}
                onChange={setSelectedLocation}
                cities={availableCities}
                loading={citiesLoading}
              />
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="mb-6 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <Input
              type="text"
              placeholder="Search events, DJs, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 text-center"
            />
          </div>
          {debouncedSearch && (
            <p className="text-center text-sm text-secondary mt-2">
              Found results in {[
                totalEventsCount > 0 && `${totalEventsCount} events`,
                totalDjsCount > 0 && `${totalDjsCount} DJs`,
                totalVenuesCount > 0 && `${totalVenuesCount} venues`,
                totalPastEventsCount > 0 && `${totalPastEventsCount} past events`,
              ].filter(Boolean).join(", ") || "no categories"}
            </p>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex justify-center gap-6 border-b border-border-subtle mb-6">
          {(["events", "djs", "venues", "history"] as TabType[]).map((tab) => {
            const badge = getTabBadge(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-label relative ${activeTab === tab ? "tab-label-active" : "tab-label-inactive"}`}
              >
                {tab.toUpperCase()}
                {badge && (
                  <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-accent-primary text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto">
          {/* EVENTS TAB */}
          {activeTab === "events" && (
            <div className="space-y-8">
              {/* Filter Button */}
              <div className="flex items-center justify-between">
                <h2 className="section-header">
                  {debouncedSearch ? `Events matching "${debouncedSearch}"` : "Upcoming Events"}
                </h2>
                <BrowseFilters 
                  filters={eventsFilters} 
                  onChange={setEventsFilters}
                  variant="compact"
                />
              </div>

              {/* Featured Events */}
              {!debouncedSearch && featuredEvents.length > 0 && (
                <section>
                  <h3 className="section-header mb-4">Featured</h3>
                  <FeaturedEventsCarousel events={featuredEvents} />
                </section>
              )}

              {/* Live Events */}
              {liveEvents.length > 0 && (
                <section>
                  <h3 className="section-header mb-4">Live Now</h3>
                  <div className="space-y-3">
                    {liveEvents.map((event) => (
                      <div key={event.id} className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-xl blur-sm opacity-40 animate-pulse" />
                        <div className="relative">
                          <EventCardRow event={event} isLive />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* All Events */}
              <section>
                {eventsLoading && allEvents.length === 0 ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex gap-3 p-2.5 rounded-xl bg-glass border border-border-subtle animate-pulse">
                        <div className="w-16 sm:w-20 aspect-square rounded-lg bg-raised" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 w-24 bg-raised rounded" />
                          <div className="h-5 w-3/4 bg-raised rounded" />
                          <div className="h-3 w-1/2 bg-raised rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : allEvents.length === 0 ? (
                  <Card className="!border-dashed !p-12 text-center">
                    <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-primary mb-2">No events found</h3>
                    <p className="text-sm text-secondary">Try adjusting your search or filters.</p>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-3">
                      {allEvents.map((event) => (
                        <EventCardRow key={event.id} event={event} />
                      ))}
                    </div>
                    {hasMoreEvents && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={() => fetchEvents(false)}
                          disabled={eventsLoading}
                          className="px-6 py-3 rounded-xl bg-glass border border-border-subtle text-primary font-medium hover:border-accent-primary/50 transition-all disabled:opacity-50"
                        >
                          {eventsLoading ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {/* DJS TAB */}
          {activeTab === "djs" && (
            <div className="space-y-6">
              {/* Filter Button */}
              <div className="flex items-center justify-between">
                <h2 className="section-header">
                  {debouncedSearch ? `DJs matching "${debouncedSearch}"` : "DJs"}
                </h2>
                <BrowseFilters 
                  filters={djsFilters} 
                  onChange={setDjsFilters}
                  variant="compact"
                />
              </div>

              {djsLoading && djs.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <DJCardSkeleton key={i} layout="portrait" />
                  ))}
                </div>
              ) : djs.length === 0 ? (
                <Card className="!border-dashed !p-12 text-center">
                  <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">No DJs found</h3>
                  <p className="text-sm text-secondary">Try adjusting your search or filters.</p>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {djs.map((dj) => (
                      <DJCard key={dj.id} dj={dj} layout="portrait" />
                    ))}
                  </div>
                  {hasMoreDjs && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => fetchDjs(false)}
                        disabled={djsLoading}
                        className="px-6 py-3 rounded-xl bg-glass border border-border-subtle text-primary font-medium hover:border-accent-primary/50 transition-all disabled:opacity-50"
                      >
                        {djsLoading ? "Loading..." : "Load More"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* VENUES TAB */}
          {activeTab === "venues" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="section-header">
                  {debouncedSearch ? `Venues matching "${debouncedSearch}"` : "Venues"}
                </h2>
              </div>

              {venuesLoading && venues.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-border-subtle bg-void animate-pulse">
                      <div className="h-[400px] bg-raised" />
                    </div>
                  ))}
                </div>
              ) : venues.length === 0 ? (
                <Card className="!border-dashed !p-12 text-center">
                  <MapPin className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">No venues found</h3>
                  <p className="text-sm text-secondary">Try adjusting your search or filters.</p>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {venues.map((venue) => (
                      <VenueCard key={venue.id} venue={venue} showRating showTags layout="portrait" />
                    ))}
                  </div>
                  {hasMoreVenues && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => fetchVenues(false)}
                        disabled={venuesLoading}
                        className="px-6 py-3 rounded-xl bg-glass border border-border-subtle text-primary font-medium hover:border-accent-primary/50 transition-all disabled:opacity-50"
                      >
                        {venuesLoading ? "Loading..." : "Load More"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-6">
              {/* Filter Button */}
              <div className="flex items-center justify-between">
                <h2 className="section-header">
                  {debouncedSearch ? `Past events matching "${debouncedSearch}"` : "Past Events"}
                </h2>
                <BrowseFilters 
                  filters={historyFilters} 
                  onChange={setHistoryFilters}
                  variant="compact"
                />
              </div>

              {pastEventsLoading && pastEvents.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-2.5 rounded-xl bg-glass border border-border-subtle animate-pulse">
                      <div className="w-16 sm:w-20 aspect-square rounded-lg bg-raised" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-24 bg-raised rounded" />
                        <div className="h-5 w-3/4 bg-raised rounded" />
                        <div className="h-3 w-1/2 bg-raised rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pastEvents.length === 0 ? (
                <Card className="!border-dashed !p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">No past events found</h3>
                  <p className="text-sm text-secondary">Past events will appear here once they&apos;ve ended.</p>
                </Card>
              ) : (
                <>
                  <div className="space-y-3">
                    {pastEvents.map((event) => (
                      <EventCardRow key={event.id} event={event} isPast />
                    ))}
                  </div>
                  {hasMorePastEvents && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => fetchPastEvents(false)}
                        disabled={pastEventsLoading}
                        className="px-6 py-3 rounded-xl bg-glass border border-border-subtle text-primary font-medium hover:border-accent-primary/50 transition-all disabled:opacity-50"
                      >
                        {pastEventsLoading ? "Loading..." : "Load More"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
