"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Container,
  Section,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@crowdstack/ui";
import {
  Building2,
  Search,
  Calendar,
  Users,
  Ticket,
  Star,
  ChevronRight,
  Mail,
  Phone,
  ExternalLink,
  UserPlus,
  StarOff,
} from "lucide-react";
import Link from "next/link";
import { AddOrganizerModal } from "@/components/AddOrganizerModal";
import { OrganizerProfileModal } from "@/components/OrganizerProfileModal";

interface Organizer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
  events_count: number;
  total_registrations: number;
  total_checkins: number;
  is_preapproved: boolean;
  partnership_id: string | null;
}

export default function VenueOrganizersPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreapprovedOnly, setShowPreapprovedOnly] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);

  useEffect(() => {
    loadOrganizers();
  }, []);

  useEffect(() => {
    filterOrganizers();
  }, [search, organizers, showPreapprovedOnly]);

  const loadOrganizers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/venue/organizers");
      if (!response.ok) throw new Error("Failed to load organizers");
      const data = await response.json();
      setOrganizers(data.organizers || []);
    } catch (error) {
      console.error("Error loading organizers:", error);
      alert("Failed to load organizers");
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizers = () => {
    let filtered = [...organizers];
    
    // Filter by pre-approved status
    if (showPreapprovedOnly) {
      filtered = filtered.filter((o) => o.is_preapproved);
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name?.toLowerCase().includes(searchLower) ||
          o.email?.toLowerCase().includes(searchLower) ||
          o.company_name?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredOrganizers(filtered);
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading organizers...</div>
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
              <h1 className="text-3xl font-bold text-primary">Organizers</h1>
              <p className="mt-2 text-sm text-secondary">
                Organizers who have created events at your venue
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Organizer
            </Button>
          </div>

          <Card>
            <div className="p-6 space-y-4">
              <Input
                placeholder="Search organizers by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="preapproved-filter"
                  checked={showPreapprovedOnly}
                  onChange={(e) => setShowPreapprovedOnly(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="preapproved-filter" className="text-sm text-primary cursor-pointer">
                  Show pre-approved only
                </label>
              </div>
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
                    <TableHead>Organizer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-secondary"
                      >
                        {organizers.length === 0
                          ? "No organizers have created events at your venue yet"
                          : "No organizers match your search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizers.map((organizer) => (
                      <TableRow
                        key={organizer.id}
                        hover
                        onClick={() => setSelectedOrganizer(organizer)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-secondary" />
                              {organizer.name}
                            </div>
                            {organizer.company_name && (
                              <div className="text-sm text-secondary">
                                {organizer.company_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {organizer.email && (
                              <div className="text-sm text-secondary flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {organizer.email}
                              </div>
                            )}
                            {organizer.phone && (
                              <div className="text-sm text-secondary flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {organizer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="primary">
                            <Calendar className="h-3 w-3 mr-1" />
                            {organizer.events_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-secondary" />
                            <span className="text-sm">{organizer.total_registrations}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Ticket className="h-4 w-4 text-secondary" />
                            <span className="text-sm">{organizer.total_checkins}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {organizer.is_preapproved ? (
                            <Badge variant="default">
                              <Star className="h-3 w-3 mr-1" />
                              Pre-approved
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Standard</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {organizer.is_preapproved ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  (async () => {
                                    if (!confirm("Remove pre-approved status? Their future events will need manual approval.")) {
                                      return;
                                    }
                                    try {
                                      const response = await fetch(
                                        `/api/venue/organizers/preapproved?id=${organizer.partnership_id}`,
                                        { method: "DELETE" }
                                      );
                                      if (response.ok) {
                                        loadOrganizers();
                                      } else {
                                        const data = await response.json();
                                        alert(data.error || "Failed to remove pre-approved status");
                                      }
                                    } catch (error) {
                                      alert("Failed to remove pre-approved status");
                                    }
                                  })();
                                }}
                                className="text-secondary hover:text-primary"
                              >
                                <StarOff className="h-4 w-4 mr-1" />
                                Remove Pre-approval
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  (async () => {
                                    try {
                                      const response = await fetch("/api/venue/organizers/preapproved", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ organizer_id: organizer.id }),
                                      });
                                      if (response.ok) {
                                        loadOrganizers();
                                      } else {
                                        const data = await response.json();
                                        alert(data.error || "Failed to pre-approve organizer");
                                      }
                                    } catch (error) {
                                      alert("Failed to pre-approve organizer");
                                    }
                                  })();
                                }}
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Pre-approve
                              </Button>
                            )}
                            <Link href={`/app/venue/events?organizer=${organizer.id}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                View Events
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
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
        </Container>
      </Section>

      <AddOrganizerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={loadOrganizers}
      />

      <OrganizerProfileModal
        isOpen={!!selectedOrganizer}
        onClose={() => setSelectedOrganizer(null)}
        organizer={selectedOrganizer}
        onPreapproveChange={loadOrganizers}
        context="venue"
      />
    </div>
  );
}
