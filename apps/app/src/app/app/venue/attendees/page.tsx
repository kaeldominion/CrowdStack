"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, Badge } from "@crowdstack/ui";
import { Search, Filter, Download, Flag, User } from "lucide-react";
import type { VenueAttendee } from "@/lib/data/attendees-venue";

export default function VenueAttendeesPage() {
  const [attendees, setAttendees] = useState<VenueAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<VenueAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    has_check_in: undefined as boolean | undefined,
    is_flagged: undefined as boolean | undefined,
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
      setAttendees(data);
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

    setFilteredAttendees(filtered);
  };

  const getStrikeBadge = (strikes: number | null) => {
    if (!strikes || strikes === 0) return null;
    if (strikes === 1) return <Badge variant="warning">1 Strike</Badge>;
    if (strikes === 2) return <Badge variant="warning">2 Strikes</Badge>;
    if (strikes >= 3) return <Badge variant="error">Banned</Badge>;
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout role="venue_admin" userEmail="">
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground-muted">Loading attendees...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="venue_admin" userEmail="">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">Attendee Database</h1>
            <p className="mt-2 text-sm text-white/60">
              All attendees who have registered or checked in to events at your venue
            </p>
          </div>
          <Button variant="secondary" onClick={() => {/* Export CSV */}}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Search and Filters */}
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
              </div>
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
                    <TableCell colSpan={7} className="text-center py-8 text-foreground-muted">
                      No attendees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendees.map((attendee) => (
                    <TableRow key={attendee.id} hover>
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
                      <TableCell>{getStrikeBadge(attendee.strike_count)}</TableCell>
                      <TableCell className="text-sm text-foreground-muted">
                        {attendee.last_event_at
                          ? new Date(attendee.last_event_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* View details */}}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* Flag attendee */}}
                          >
                            <Flag className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
}

