"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Building2, Plus, Search, ChevronRight, ExternalLink } from "lucide-react";
import { formatVenueLocation } from "@/lib/utils/format-venue-location";
import { CreateVenueModal } from "@/components/CreateVenueModal";
import { EditVenueModal } from "@/components/EditVenueModal";

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any | null>(null);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [search, venues]);

  const loadVenues = async () => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin Venues] Starting to load venues...");
        console.log("[Admin Venues] Fetching from:", "/api/admin/venues");
        console.log("[Admin Venues] Current URL:", typeof window !== "undefined" ? window.location.href : "server");
      }
      
      const response = await fetch("/api/admin/venues");
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin Venues] Response status:", response.status, response.statusText);
        console.log("[Admin Venues] Response headers:", Object.fromEntries(response.headers.entries()));
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch((e) => {
          console.error("[Admin Venues] Failed to parse error response:", e);
          return { error: "Unknown error" };
        });
        console.error("[Admin Venues] Failed to load venues:", response.status, errorData);
        
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 403) {
          alert("Access denied. You need superadmin role to view venues.");
        } else if (response.status === 502) {
          alert("Proxy error. Check if apps/app is running on port 3007.");
        } else {
          alert(`Failed to load venues: ${errorData.error || response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to load venues");
      }
      
      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin Venues] Received data:", data);
        console.log("[Admin Venues] Venues count:", data.venues?.length || 0);
      }
      setVenues(data.venues || []);
    } catch (error) {
      console.error("[Admin Venues] Error loading venues:", error);
      console.error("[Admin Venues] Error stack:", error instanceof Error ? error.stack : "No stack");
      alert(`Error loading venues: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const filterVenues = () => {
    let filtered = [...venues];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.city?.toLowerCase().includes(searchLower) ||
          v.email?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredVenues(filtered);
  };

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
              Showing {filteredVenues.length} of {venues.length} venues
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
                  {filteredVenues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-secondary">
                        No venues found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVenues.map((venue) => (
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

          <CreateVenueModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadVenues();
            }}
          />

          <EditVenueModal
            isOpen={!!editingVenue}
            onClose={() => setEditingVenue(null)}
            onSuccess={() => {
              loadVenues();
              setEditingVenue(null);
            }}
            venue={editingVenue}
            onDelete={() => {
              loadVenues();
              setEditingVenue(null);
            }}
          />
        </Container>
      </Section>
    </div>
  );
}

