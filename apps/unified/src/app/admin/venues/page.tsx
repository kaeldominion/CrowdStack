"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@crowdstack/ui";
import { Building2, Plus, Search, Edit, Trash2 } from "lucide-react";
import { CreateVenueModal } from "@/components/CreateVenueModal";
import { EditVenueModal } from "@/components/EditVenueModal";

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<any | null>(null);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [search, venues]);

  const loadVenues = async () => {
    try {
      console.log("[Admin Venues] Starting to load venues...");
      console.log("[Admin Venues] Fetching from:", "/api/admin/venues");
      console.log("[Admin Venues] Current URL:", typeof window !== "undefined" ? window.location.href : "server");
      
      const response = await fetch("/api/admin/venues");
      console.log("[Admin Venues] Response status:", response.status, response.statusText);
      console.log("[Admin Venues] Response headers:", Object.fromEntries(response.headers.entries()));
      
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
      console.log("[Admin Venues] Received data:", data);
      console.log("[Admin Venues] Venues count:", data.venues?.length || 0);
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
          <div className="text-foreground-muted">Loading venues...</div>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Venue Management</h1>
              <p className="mt-2 text-sm text-foreground-muted">
                Manage all venues in the system
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Venue
            </Button>
          </div>

          <Card>
            <div className="p-6">
              <Input
                placeholder="Search venues by name, city, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </Card>

          <div className="mt-4 text-sm text-foreground-muted">
            Showing {filteredVenues.length} of {venues.length} venues
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-foreground-muted">
                        No venues found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVenues.map((venue) => (
                      <TableRow key={venue.id} hover>
                        <TableCell className="font-medium">{venue.name}</TableCell>
                        <TableCell>
                          {venue.city && venue.state ? `${venue.city}, ${venue.state}` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {venue.email && (
                              <div className="text-sm text-foreground-muted">{venue.email}</div>
                            )}
                            {venue.phone && (
                              <div className="text-sm text-foreground-muted">{venue.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{venue.events_count || 0}</TableCell>
                        <TableCell className="text-sm text-foreground-muted">
                          {new Date(venue.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditingVenue(venue)}
                              title="Edit venue"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDeletingVenue(venue)}
                              title="Delete venue"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
          />

          {/* Delete Confirmation Modal */}
          {deletingVenue && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Delete Venue</h3>
                <p className="text-foreground-muted mb-4">
                  Are you sure you want to delete <strong>{deletingVenue.name}</strong>?
                  {deletingVenue.events_count > 0 && (
                    <span className="block mt-2 text-warning">
                      ⚠️ This venue has {deletingVenue.events_count} event(s) and cannot be deleted.
                    </span>
                  )}
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setDeletingVenue(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/admin/venues/${deletingVenue.id}`, {
                          method: "DELETE",
                        });

                        if (!response.ok) {
                          const data = await response.json();
                          throw new Error(data.error || "Failed to delete venue");
                        }

                        loadVenues();
                        setDeletingVenue(null);
                      } catch (error: any) {
                        alert(error.message || "Failed to delete venue");
                      }
                    }}
                    disabled={deletingVenue.events_count > 0}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}

