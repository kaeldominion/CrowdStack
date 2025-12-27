"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Calendar, Plus, Search, ChevronRight } from "lucide-react";
import { CreateOrganizerModal } from "@/components/CreateOrganizerModal";
import { EditOrganizerModal } from "@/components/EditOrganizerModal";

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrganizer, setEditingOrganizer] = useState<any | null>(null);

  useEffect(() => {
    loadOrganizers();
  }, []);

  useEffect(() => {
    filterOrganizers();
  }, [search, organizers]);

  const loadOrganizers = async () => {
    try {
      const response = await fetch("/api/admin/organizers");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 403) {
          alert("Access denied. You need superadmin role to view organizers.");
        } else {
          alert(`Failed to load organizers: ${errorData.error || response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to load organizers");
      }
      
      const data = await response.json();
      setOrganizers(data.organizers || []);
    } catch (error) {
      console.error("Error loading organizers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizers = () => {
    let filtered = [...organizers];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name?.toLowerCase().includes(searchLower) ||
          o.email?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredOrganizers(filtered);
  };

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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Organizer Management</h1>
              <p className="mt-2 text-sm text-secondary">
                Manage all event organizers in the system
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organizer
            </Button>
          </div>

          <Card>
            <div className="p-6">
              <Input
                placeholder="Search organizers by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </Card>

          <div className="mt-4 text-sm text-secondary">
            Showing {filteredOrganizers.length} of {organizers.length} organizers
          </div>

          <Card>
            <div className="overflow-x-auto">
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
                  {filteredOrganizers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-secondary">
                        No organizers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizers.map((organizer) => (
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

          <CreateOrganizerModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadOrganizers();
            }}
          />

          <EditOrganizerModal
            isOpen={!!editingOrganizer}
            onClose={() => setEditingOrganizer(null)}
            onSuccess={() => {
              loadOrganizers();
              setEditingOrganizer(null);
            }}
            organizer={editingOrganizer}
            onDelete={() => {
              loadOrganizers();
              setEditingOrganizer(null);
            }}
          />
        </Container>
      </Section>
    </div>
  );
}

