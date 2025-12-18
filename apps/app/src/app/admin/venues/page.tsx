"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@crowdstack/ui";
import { Building2, Plus, Search, Edit, Trash2 } from "lucide-react";
import { CreateVenueModal } from "@/components/CreateVenueModal";

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [search, venues]);

  const loadVenues = async () => {
    try {
      const response = await fetch("/api/admin/venues");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to load venues:", response.status, errorData);
        if (response.status === 403) {
          alert("Access denied. You need superadmin role to view venues.");
        }
        throw new Error(errorData.error || "Failed to load venues");
      }
      const data = await response.json();
      setVenues(data.venues || []);
    } catch (error) {
      console.error("Error loading venues:", error);
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
                            <Button variant="ghost" size="sm" onClick={() => {/* Edit */}}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {/* Delete */}}>
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
        </Container>
      </Section>
    </div>
  );
}

