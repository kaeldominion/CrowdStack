"use client";

import { useState, useEffect } from "react";
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, Badge } from "@crowdstack/ui";
import { VipBadge } from "@crowdstack/ui";
import { Search, Filter, Download, Flag, User, UserCheck, Crown, Star } from "lucide-react";
import type { VenueAttendee } from "@/lib/data/attendees-venue";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";

export default function VenueAttendeesPage() {
  const [attendees, setAttendees] = useState<VenueAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<VenueAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    has_check_in: undefined as boolean | undefined,
    is_flagged: undefined as boolean | undefined,
    is_vip: undefined as boolean | undefined,
  });

  useEffect(() => {
    loadAttendees();
  }, []);

  useEffect(() => {
    filterAttendees();
  }, [search, filters, attendees]);

  const loadAttendees = async () => {
    try {
      const response = await fetch("/api/venue/attendees");
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data.attendees || data); // Handle both old and new format
      if (data.venueId) {
        setVenueId(data.venueId);
      }
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone.includes(search)
      );
    }

    // Check-in filter
    if (filters.has_check_in !== undefined) {
      filtered = filtered.filter((a) =>
        filters.has_check_in ? a.total_check_ins > 0 : a.total_check_ins === 0
      );
    }

    // Flagged filter
    if (filters.is_flagged !== undefined) {
      filtered = filtered.filter((a) =>
        filters.is_flagged ? (a.strike_count || 0) > 0 : (a.strike_count || 0) === 0
      );
    }

    // VIP filter
    if (filters.is_vip !== undefined) {
      filtered = filtered.filter((a) =>
        filters.is_vip ? (a.is_venue_vip || a.is_global_vip) : !a.is_venue_vip && !a.is_global_vip
      );
    }

    setFilteredAttendees(filtered);
  };

  const getStrikeBadge = (strikes: number | null) => {
    if (!strikes || strikes === 0) return null;
    if (strikes === 1) return <Badge variant="warning">1 Strike</Badge>;
    if (strikes === 2) return <Badge variant="warning">2 Strikes</Badge>;
    if (strikes >= 3) return <Badge variant="error">Banned</Badge>;
    return null;
  };

  const toggleVenueVip = async (attendeeId: string, isCurrentlyVip: boolean) => {
    if (!venueId) {
      alert("Venue ID not found");
      return;
    }

    try {
      if (isCurrentlyVip) {
        // Remove VIP
        const response = await fetch(
          `/api/venue/attendees/${attendeeId}/vip?venueId=${venueId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to remove VIP");
      } else {
        // Add VIP
        const response = await fetch(`/api/venue/attendees/${attendeeId}/vip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId }),
        });
        if (!response.ok) throw new Error("Failed to add VIP");
      }
      // Reload attendees
      await loadAttendees();
    } catch (error) {
      console.error("Error toggling VIP:", error);
      alert("Failed to update VIP status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading attendees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-primary">Attendee Database</h1>
          <p className="mt-2 text-sm text-secondary">
            All attendees who have registered or checked in to events at your venue
          </p>
        </div>
        <Button variant="secondary" disabled title="Export functionality is disabled to protect attendee privacy. Use messaging features to communicate with your audience.">
          <Download className="h-4 w-4 mr-2" />
          Export (Disabled)
        </Button>
      </div>

      {/* Access Scope Explanation */}
      <Card className="bg-accent-secondary/10 border-accent-secondary/20 hidden md:block">
        <div className="p-4">
          <p className="text-sm text-white/80">
            <strong>Privacy Protection:</strong> You're viewing attendees who registered or checked in at your venue.
            CrowdStack protects attendee privacy - you only see guests who interacted with you directly.
            Contact details are masked for security. Use our messaging features to communicate with your audience.
          </p>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card>
        <div className="p-3 space-y-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filters.has_check_in === true ? "primary" : "secondary"}
              onClick={() =>
                setFilters({
                  ...filters,
                  has_check_in: filters.has_check_in === true ? undefined : true,
                })
              }
            >
              <Filter className="h-4 w-4 mr-2" />
              Checked In
            </Button>
            <Button
              variant={filters.is_flagged === true ? "primary" : "secondary"}
              onClick={() =>
                setFilters({
                  ...filters,
                  is_flagged: filters.is_flagged === true ? undefined : true,
                })
              }
            >
              <Flag className="h-4 w-4 mr-2" />
              Flagged
            </Button>
            <Button
              variant={filters.is_vip === true ? "primary" : "secondary"}
              onClick={() =>
                setFilters({
                  ...filters,
                  is_vip: filters.is_vip === true ? undefined : true,
                })
              }
            >
              <Crown className="h-4 w-4 mr-2" />
              VIP
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-white/60">
        Showing {filteredAttendees.length} of {attendees.length} attendees
      </div>

      {/* Attendees Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Event</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-secondary">
                    No attendees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendees.map((attendee) => (
                  <TableRow 
                    key={attendee.id} 
                    hover 
                    onClick={() => setSelectedAttendeeId(attendee.id)}
                  >
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {attendee.email && (
                          <div className="text-sm text-secondary">{attendee.email}</div>
                        )}
                        <div className="text-sm text-secondary">{attendee.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {attendee.is_global_vip && (
                          <VipBadge level="global" variant="badge" size="xs" />
                        )}
                        {attendee.is_venue_vip && (
                          <VipBadge level="venue" variant="badge" size="xs" />
                        )}
                        {!attendee.is_global_vip && !attendee.is_venue_vip && (
                          <span className="text-xs text-secondary">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {attendee.user_id ? (
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-4 w-4 text-success" />
                          <span className="text-xs text-secondary">Linked</span>
                        </div>
                      ) : (
                        <span className="text-xs text-secondary">No account</span>
                      )}
                    </TableCell>
                    <TableCell>{attendee.events_attended}</TableCell>
                    <TableCell>{attendee.total_check_ins}</TableCell>
                    <TableCell>{getStrikeBadge(attendee.strike_count)}</TableCell>
                    <TableCell className="text-sm text-secondary">
                      {attendee.last_event_at
                        ? new Date(attendee.last_event_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* Flag attendee - TODO: implement flag modal */}}
                          title="Flag attendee"
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            toggleVenueVip(attendee.id, attendee.is_venue_vip);
                          }}
                          title={attendee.is_venue_vip ? "Remove venue VIP" : "Mark as venue VIP"}
                        >
                          {attendee.is_venue_vip ? (
                            <Star className="h-4 w-4 text-accent-primary fill-accent-primary" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
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

      <AttendeeDetailModal
        isOpen={!!selectedAttendeeId}
        onClose={() => setSelectedAttendeeId(null)}
        attendeeId={selectedAttendeeId || ""}
        role="venue"
      />
    </div>
  );
}
