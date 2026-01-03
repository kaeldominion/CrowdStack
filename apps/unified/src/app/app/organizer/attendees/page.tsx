"use client";

import { useState, useEffect } from "react";
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, Badge } from "@crowdstack/ui";
import { VipBadge } from "@crowdstack/ui";
import { Search, Filter, Download, User, Crown, Sparkles } from "lucide-react";
import type { OrganizerAttendee } from "@/lib/data/attendees-organizer";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";

export default function OrganizerAttendeesPage() {
  const [attendees, setAttendees] = useState<OrganizerAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<OrganizerAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    has_check_in: undefined as boolean | undefined,
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
      const response = await fetch("/api/organizer/attendees");
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data.attendees || data); // Handle both old and new format
      if (data.organizerId) {
        setOrganizerId(data.organizerId);
      }
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone.includes(search)
      );
    }

    if (filters.has_check_in !== undefined) {
      filtered = filtered.filter((a) =>
        filters.has_check_in ? a.total_check_ins > 0 : a.total_check_ins === 0
      );
    }

    // VIP filter
    if (filters.is_vip !== undefined) {
      filtered = filtered.filter((a) =>
        filters.is_vip ? (a.is_organizer_vip || a.is_global_vip) : !a.is_organizer_vip && !a.is_global_vip
      );
    }

    setFilteredAttendees(filtered);
  };

  const toggleOrganizerVip = async (attendeeId: string, isCurrentlyVip: boolean) => {
    if (!organizerId) {
      alert("Organizer ID not found");
      return;
    }

    try {
      if (isCurrentlyVip) {
        // Remove VIP
        const response = await fetch(
          `/api/organizer/attendees/${attendeeId}/vip?organizerId=${organizerId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to remove VIP");
      } else {
        // Add VIP
        const response = await fetch(`/api/organizer/attendees/${attendeeId}/vip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizerId }),
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
            All attendees who have registered or checked in to your events
          </p>
        </div>
        <Button variant="secondary" disabled title="Export functionality is disabled to protect attendee privacy. Use messaging features to communicate with your audience.">
          <Download className="h-4 w-4 mr-2" />
          Export (Disabled)
        </Button>
      </div>

      {/* Access Scope Explanation */}
      <Card className="bg-accent-secondary/10 border-accent-secondary/20">
        <div className="p-4">
          <p className="text-sm text-primary">
            <strong>Privacy Protection:</strong> You're viewing attendees who registered or checked in to your events.
            CrowdStack protects attendee privacy - you only see guests who interacted with your events directly.
            Contact details are masked for security. Use our messaging features to communicate with your audience.
          </p>
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
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

      <div className="text-sm text-secondary">
        Showing {filteredAttendees.length} of {attendees.length} attendees
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Last Event</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-secondary">
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
                        {attendee.is_organizer_vip && (
                          <VipBadge level="organizer" variant="badge" size="xs" />
                        )}
                        {!attendee.is_global_vip && !attendee.is_organizer_vip && (
                          <span className="text-xs text-secondary">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{attendee.events_attended}</TableCell>
                    <TableCell>{attendee.total_check_ins}</TableCell>
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
                          onClick={(e) => {
                            e?.stopPropagation();
                            toggleOrganizerVip(attendee.id, attendee.is_organizer_vip);
                          }}
                          disabled={attendee.is_global_vip}
                          title={
                            attendee.is_global_vip
                              ? "Global VIP (system-managed, cannot be changed)"
                              : attendee.is_organizer_vip
                              ? "Remove organizer VIP"
                              : "Mark as organizer VIP"
                          }
                        >
                          {attendee.is_organizer_vip ? (
                            <Sparkles className="h-4 w-4 text-accent-secondary fill-accent-secondary" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
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
        role="organizer"
      />
    </div>
  );
}
