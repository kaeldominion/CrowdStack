"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Calendar, Plus, Search, ChevronRight, Loader2 } from "lucide-react";
import { CreateOrganizerModal } from "@/components/CreateOrganizerModal";
import { EditOrganizerModal } from "@/components/EditOrganizerModal";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrganizer, setEditingOrganizer] = useState<any | null>(null);
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
    setOrganizers([]);
    setPagination(null);
    setLoading(true);
    loadOrganizers(1, debouncedSearch);
  }, [debouncedSearch]);

  const loadOrganizers = async (page: number = 1, searchQuery: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/admin/organizers?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 403) {
          alert("Access denied. You need superadmin role to view organizers.");
        }
        throw new Error(errorData.error || "Failed to load organizers");
      }

      const data = await response.json();

      if (page === 1) {
        setOrganizers(data.organizers || []);
      } else {
        setOrganizers(prev => [...prev, ...(data.organizers || [])]);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading organizers:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination?.hasMore) return;
    setLoadingMore(true);
    loadOrganizers(pagination.page + 1, debouncedSearch);
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
          <LoadingSpinner text="Loading organizers..." />
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
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Organizer Management</h1>
              <p className="text-sm text-secondary">
                Manage all event organizers in the system
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organizer
            </Button>
          </div>

          <Card className="!p-4">
            <Input
              placeholder="Search organizers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          <div className="mt-4 mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {organizers.length} of {pagination?.total || 0} organizers
              {debouncedSearch && ` matching "${debouncedSearch}"`}
            </p>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizers.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-secondary">
                        {debouncedSearch ? `No organizers found matching "${debouncedSearch}"` : "No organizers found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizers.map((organizer) => (
                      <TableRow
                        key={organizer.id}
                        hover
                        className="cursor-pointer"
                        onClick={() => setEditingOrganizer(organizer)}
                      >
                        <TableCell className="font-medium">{organizer.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {organizer.email && (
                              <div className="text-sm text-secondary">{organizer.email}</div>
                            )}
                            {organizer.phone && (
                              <div className="text-sm text-secondary">{organizer.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{organizer.events_count || 0}</TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(organizer.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-secondary" />
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
                <span className="text-sm">Loading more organizers...</span>
              </div>
            )}
            {!loadingMore && pagination?.hasMore && (
              <Button variant="ghost" onClick={loadMore}>
                Load More
              </Button>
            )}
            {!pagination?.hasMore && organizers.length > 0 && (
              <p className="text-sm text-secondary">
                All {pagination?.total || organizers.length} organizers loaded
              </p>
            )}
          </div>

          <CreateOrganizerModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setOrganizers([]);
              setPagination(null);
              setLoading(true);
              loadOrganizers(1, debouncedSearch);
            }}
          />

          <EditOrganizerModal
            isOpen={!!editingOrganizer}
            onClose={() => setEditingOrganizer(null)}
            onSuccess={() => {
              setOrganizers([]);
              setPagination(null);
              setLoading(true);
              loadOrganizers(1, debouncedSearch);
              setEditingOrganizer(null);
            }}
            organizer={editingOrganizer}
            onDelete={() => {
              setOrganizers([]);
              setPagination(null);
              setLoading(true);
              loadOrganizers(1, debouncedSearch);
              setEditingOrganizer(null);
            }}
          />
        </Container>
      </Section>
    </div>
  );
}
