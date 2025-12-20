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
  Modal,
} from "@crowdstack/ui";
import {
  Users,
  Search,
  Calendar,
  TrendingUp,
  Ticket,
  Mail,
  Phone,
  UserPlus,
  QrCode,
  Info,
} from "lucide-react";
import { AddPromoterModal } from "@/components/AddPromoterModal";
import { PromoterProfileModal } from "@/components/PromoterProfileModal";

interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  events_count: number;
  referrals_count: number;
  checkins_count: number;
  conversion_rate: number;
  has_direct_assignment: boolean;
  has_indirect_assignment: boolean;
}

export default function OrganizerPromotersPage() {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [filteredPromoters, setFilteredPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState<Promoter | null>(null);

  useEffect(() => {
    loadPromoters();
  }, []);

  useEffect(() => {
    filterPromoters();
  }, [search, promoters]);

  const loadPromoters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/organizer/promoters");
      if (!response.ok) throw new Error("Failed to load promoters");
      const data = await response.json();
      setPromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading promoters:", error);
      alert("Failed to load promoters");
    } finally {
      setLoading(false);
    }
  };

  const filterPromoters = () => {
    let filtered = [...promoters];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredPromoters(filtered);
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground-muted">Loading promoters...</div>
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
              <h1 className="text-3xl font-bold text-foreground">Promoters</h1>
              <p className="mt-2 text-sm text-foreground-muted">
                Promoters who have worked on your events
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Promoter
            </Button>
          </div>

          <Card>
            <div className="p-6">
              <Input
                placeholder="Search promoters by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </Card>

          <div className="mt-4 text-sm text-foreground-muted">
            Showing {filteredPromoters.length} of {promoters.length} promoters
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoter</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Assignment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromoters.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-foreground-muted"
                      >
                        {promoters.length === 0
                          ? "No promoters have worked on your events yet. Add one to get started!"
                          : "No promoters match your search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPromoters.map((promoter) => (
                      <TableRow
                        key={promoter.id}
                        hover
                        onClick={() => setSelectedPromoter(promoter)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-foreground-muted" />
                            {promoter.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {promoter.email && (
                              <div className="text-sm text-foreground-muted flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {promoter.email}
                              </div>
                            )}
                            {promoter.phone && (
                              <div className="text-sm text-foreground-muted flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {promoter.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="primary">
                            <Calendar className="h-3 w-3 mr-1" />
                            {promoter.events_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-foreground-muted" />
                            <span className="text-sm">{promoter.referrals_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Ticket className="h-4 w-4 text-foreground-muted" />
                            <span className="text-sm">{promoter.checkins_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-foreground-muted" />
                            <span className="text-sm font-medium">
                              {promoter.conversion_rate}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {promoter.has_direct_assignment && (
                              <Badge variant="default" className="text-xs">
                                Direct
                              </Badge>
                            )}
                            {promoter.has_indirect_assignment && (
                              <Badge variant="secondary" className="text-xs">
                                Via Venue
                              </Badge>
                            )}
                            {!promoter.has_direct_assignment && !promoter.has_indirect_assignment && (
                              <span className="text-xs text-foreground-muted">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {promoters.length > 0 && (
            <Card className="mt-4">
              <div className="p-4 flex items-start gap-3 bg-background-secondary rounded-lg">
                <Info className="h-5 w-5 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div className="text-sm text-foreground-muted">
                  <p className="font-medium text-foreground mb-1">About Promoter Assignments</p>
                  <p>
                    <strong>Direct</strong> means you assigned this promoter directly to your events.{" "}
                    <strong>Via Venue</strong> means the promoter was assigned by the venue for events at their location. 
                    This helps track relationships and maintain accountability while allowing promoters to work with multiple parties.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </Container>
      </Section>

      {showAddModal && (
        <AddPromoterModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            loadPromoters();
          }}
          context="organizer"
        />
      )}

      <PromoterProfileModal
        isOpen={!!selectedPromoter}
        onClose={() => setSelectedPromoter(null)}
        promoter={selectedPromoter}
        context="organizer"
      />
    </div>
  );
}
