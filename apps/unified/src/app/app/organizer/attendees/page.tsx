"use client";

import { useState, useEffect } from "react";
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, Badge } from "@crowdstack/ui";
import { Search, Filter, Download, User } from "lucide-react";
import type { OrganizerAttendee } from "@/lib/data/attendees-organizer";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";

export default function OrganizerAttendeesPage() {
  const [attendees, setAttendees] = useState<OrganizerAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<OrganizerAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    has_check_in: undefined as boolean | undefined,
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
      setAttendees(data);
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

    setFilteredAttendees(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading attendees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Attendee Database</h1>
          <p className="mt-2 text-sm text-white/60">
            All attendees who have registered or checked in to your events
          </p>
        </div>
        <Button variant="secondary" disabled title="Export functionality is disabled to protect attendee privacy. Use messaging features to communicate with your audience.">
          <Download className="h-4 w-4 mr-2" />
          Export (Disabled)
        </Button>
      </div>

      {/* Access Scope Explanation */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <div className="p-4">
          <p className="text-sm text-white/80">
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
          </div>
        </div>
      </Card>

      <div className="text-sm text-white/60">
        Showing {filteredAttendees.length} of {attendees.length} attendees
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Last Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-foreground-muted">
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
                          <div className="text-sm text-foreground-muted">{attendee.email}</div>
                        )}
                        <div className="text-sm text-foreground-muted">{attendee.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{attendee.events_attended}</TableCell>
                    <TableCell>{attendee.total_check_ins}</TableCell>
                    <TableCell className="text-sm text-foreground-muted">
                      {attendee.last_event_at
                        ? new Date(attendee.last_event_at).toLocaleDateString()
                        : "—"}
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
