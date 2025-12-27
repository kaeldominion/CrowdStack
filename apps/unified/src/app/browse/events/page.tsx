"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Input } from "@crowdstack/ui";
import { ArrowLeft, Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { EventCardRow } from "@/components/EventCardRow";
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

const EVENTS_PER_PAGE = 20;

export default function BrowseAllEventsPage() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city") || "";
  const initialSearch = searchParams.get("search") || "";

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedLocation, setSelectedLocation] = useState(initialCity);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableCities, setAvailableCities] = useState<{ value: string; label: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const totalPages = Math.ceil(totalCount / EVENTS_PER_PAGE);

  // Fetch available cities
  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch("/api/browse/events?limit=1000");
        const data = await res.json();
        
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

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(EVENTS_PER_PAGE),
          offset: String((currentPage - 1) * EVENTS_PER_PAGE),
        });

        if (searchQuery) {
          params.append("search", searchQuery);
        }
        if (selectedLocation) {
          params.append("city", selectedLocation);
        }

        const res = await fetch(`/api/browse/events?${params}`);
        const data = await res.json();
        
        setEvents(data.events || []);
        setTotalCount(data.totalCount || data.count || 0);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [currentPage, searchQuery, selectedLocation]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLocation]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("...");
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Browse
          </Link>
          <h1 className="page-title">All Upcoming Events</h1>
          <p className="text-secondary mt-2">
            {totalCount} event{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>
          <LocationSelector
            value={selectedLocation}
            onChange={setSelectedLocation}
            cities={availableCities}
            loading={citiesLoading}
          />
        </div>

        {/* Events List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex gap-3 p-2.5 rounded-xl bg-glass border border-border-subtle animate-pulse"
              >
                <div className="w-16 sm:w-20 aspect-square rounded-lg bg-raised" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-24 bg-raised rounded" />
                  <div className="h-5 w-3/4 bg-raised rounded" />
                  <div className="h-3 w-1/2 bg-raised rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="!border-dashed !p-12 text-center">
            <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">
              No events found
            </h3>
            <p className="text-sm text-secondary">
              Try adjusting your search or location to find more events.
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {events.map((event) => (
                <EventCardRow key={event.id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-glass border border-border-subtle text-primary hover:border-accent-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-muted">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[40px] py-2 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? "bg-accent-primary text-white"
                            : "bg-glass border border-border-subtle text-primary hover:border-accent-primary/50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-glass border border-border-subtle text-primary hover:border-accent-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Page info */}
            {totalPages > 1 && (
              <p className="text-center text-sm text-secondary mt-4">
                Page {currentPage} of {totalPages} ({totalCount} events)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

