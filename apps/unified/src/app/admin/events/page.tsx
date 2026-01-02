"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Calendar, Plus, Search, ExternalLink, ChevronRight, ShieldCheck, ShieldX, ShieldAlert, Globe, EyeOff } from "lucide-react";
import Link from "next/link";
import { EventStatusBadge, EventStatusStepper, type EventStatus } from "@/components/EventStatusStepper";

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [search, statusFilter, events]);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.venue?.name?.toLowerCase().includes(searchLower) ||
          e.organizer?.name?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    setFilteredEvents(filtered);
  };

  // Using EventStatusBadge component from EventStatusStepper

  const getApprovalBadge = (approvalStatus: string | null, hasVenue: boolean) => {
    if (!hasVenue) {
      return <Badge variant="default">—</Badge>;
    }
    switch (approvalStatus) {
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <ShieldX className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="default">—</Badge>;
    }
  };

  const handlePublishToggle = async (eventId: string, currentStatus: string) => {
    setPublishing(eventId);
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event status");
      }

      // Update the event in the local state
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
      );
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading events..." />
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
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Event Management</h1>
              <p className="text-sm text-secondary">
                View and manage all events in the system
              </p>
            </div>
            <Link href="/app/organizer/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>

          <Card className="!p-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search events by name, venue, or organizer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg bg-void border border-border-subtle px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="ended">Ended</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="mt-4 mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-secondary">
                        No events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow 
                        key={event.id} 
                        hover
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/events/${event.id}`)}
                      >
                        <TableCell className="font-medium">
                          {event.name}
                          {event.slug && (
                            <span className="ml-2">
                              <a
                                href={`/e/${event.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-secondary hover:text-primary"
                                title="View Public Page"
                              >
                                <ExternalLink className="h-3 w-3 inline" />
                              </a>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{event.venue?.name || "—"}</TableCell>
                        <TableCell>{event.organizer?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(event.start_time).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{event.registrations_count || 0}</TableCell>
                        <TableCell>{event.checkins_count || 0}</TableCell>
                        <TableCell>{getApprovalBadge(event.venue_approval_status, !!event.venue_id)}</TableCell>
                        <TableCell>
                          <EventStatusBadge status={(event.status || "draft") as EventStatus} />
                        </TableCell>
                        <TableCell>
                          <div 
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(event.status || "draft") === "published" ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePublishToggle(event.id, event.status || "draft")}
                                disabled={publishing === event.id}
                                loading={publishing === event.id}
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Unpublish
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handlePublishToggle(event.id, event.status || "draft")}
                                disabled={publishing === event.id}
                                loading={publishing === event.id}
                              >
                                <Globe className="h-3 w-3 mr-1" />
                                Publish
                              </Button>
                            )}
                            <ChevronRight className="h-4 w-4 text-secondary" />
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
    </div>
  );
}

