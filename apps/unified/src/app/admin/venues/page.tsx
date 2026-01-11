"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Building2, Plus, Search, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { formatVenueLocation } from "@/lib/utils/format-venue-location";
import { CreateVenueModal } from "@/components/CreateVenueModal";
import { EditVenueModal } from "@/components/EditVenueModal";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and load when search changes
  useEffect(() => {
    setVenues([]);
    setPagination(null);
    setLoading(true);
    loadVenues(1, debouncedSearch);
  }, [debouncedSearch]);

  const loadVenues = async (page: number = 1, searchQuery: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/admin/venues?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 403) {
          alert("Access denied. You need superadmin role to view venues.");
        }
        throw new Error(errorData.error || "Failed to load venues");
      }

      const data = await response.json();

      if (page === 1) {
        setVenues(data.venues || []);
      } else {
        setVenues(prev => [...prev, ...(data.venues || [])]);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading venues:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination?.hasMore) return;
    setLoadingMore(true);
    loadVenues(pagination.page + 1, debouncedSearch);
  }, [loadingMore, pagination, debouncedSearch]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination?.hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pagination, loadingMore, loadMore]);

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading venues..." />
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Venue Management</h1>
              <p className="text-sm text-secondary">
                Manage all venues in the system
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Venue
            </Button>
          </div>

          <Card className="!p-4">
            <Input
              placeholder="Search venues by name, city, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          <div className="mt-4 mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {venues.length} of {pagination?.total || 0} venues
              {debouncedSearch && ` matching "${debouncedSearch}"`}
            </p>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-secondary">
                        {debouncedSearch ? `No venues found matching "${debouncedSearch}"` : "No venues found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    venues.map((venue) => (
                      <TableRow
                        key={venue.id}
                        hover
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={`/app/venue/settings?venueId=${venue.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {venue.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {formatVenueLocation({
                            city: venue.city,
                            state: venue.state,
                            country: venue.country,
                          }) || venue.address || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {venue.email && (
                              <div className="text-sm text-secondary">{venue.email}</div>
                            )}
                            {venue.phone && (
                              <div className="text-sm text-secondary">{venue.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{venue.events_count || 0}</TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(venue.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {venue.slug && (
                              <Link
                                href={`${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/v/${venue.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Public
                              </Link>
                            )}
                            <Link
                              href={`/admin/venues/${venue.id}`}
                              className="text-secondary hover:text-primary"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Infinite Scroll Trigger */}
          <div
            ref={loadMoreRef}
            className="py-8 flex items-center justify-center"
          >
            {loadingMore && (
              <div className="flex items-center gap-2 text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading more venues...</span>
              </div>
            )}
            {!loadingMore && pagination?.hasMore && (
              <Button variant="ghost" onClick={loadMore}>
                Load More
              </Button>
            )}
            {!pagination?.hasMore && venues.length > 0 && (
              <p className="text-sm text-secondary">
                All {pagination?.total || venues.length} venues loaded
              </p>
            )}
          </div>

          <CreateVenueModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setVenues([]);
              setPagination(null);
              setLoading(true);
              loadVenues(1, debouncedSearch);
            }}
          />

          <EditVenueModal
            isOpen={!!editingVenue}
            onClose={() => setEditingVenue(null)}
            onSuccess={() => {
              setVenues([]);
              setPagination(null);
              setLoading(true);
              loadVenues(1, debouncedSearch);
              setEditingVenue(null);
            }}
            venue={editingVenue}
            onDelete={() => {
              setVenues([]);
              setPagination(null);
              setLoading(true);
              loadVenues(1, debouncedSearch);
              setEditingVenue(null);
            }}
          />
        </Container>
      </Section>
    </div>
  );
}
