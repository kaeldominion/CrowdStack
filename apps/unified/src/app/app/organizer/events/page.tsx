"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@crowdstack/ui";
import { Plus, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status: string;
  venue_rejection_reason: string | null;
  registrations: number;
  checkins: number;
  venue: { id: string; name: string } | null;
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/organizer/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getApprovalBadge = (status: string, rejectionReason?: string | null) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" title="Waiting for venue approval">
            Pending Approval
          </Badge>
        );
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return (
          <Badge variant="danger" title={rejectionReason || "Rejected by venue"}>
            Rejected
          </Badge>
        );
      case "not_required":
        return <Badge variant="secondary">No Venue</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading events...</div>
      </div>
    );
  }

  // Check if there are any pending events
  const pendingEvents = events.filter((e) => e.venue_approval_status === "pending");
  const rejectedEvents = events.filter((e) => e.venue_approval_status === "rejected");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Events</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Manage your events and track performance
          </p>
        </div>
        <Link href="/app/organizer/events/new">
          <Button variant="primary" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Pending Approval Alert */}
      {pendingEvents.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning">
              {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} pending venue approval
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              These events are waiting to be approved by their respective venues before they can go live.
            </p>
          </div>
        </div>
      )}

      {/* Rejected Events Alert */}
      {rejectedEvents.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">
              {rejectedEvents.length} event{rejectedEvents.length > 1 ? "s" : ""} rejected
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              These events were not approved by the venue. You can edit and try a different venue.
            </p>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-foreground-muted" />}
          title="No events yet"
          description="Create your first event to start tracking attendance and managing promoters."
          action={{
            label: "Create Event",
            href: "/app/organizer/events/new"
          }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Registrations</TableHead>
              <TableHead>Check-ins</TableHead>
              <TableHead>Venue Approval</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow 
                key={event.id} 
                hover
                className="cursor-pointer"
                onClick={() => router.push(`/app/organizer/events/${event.id}`)}
              >
                <TableCell className="font-medium">{event.name}</TableCell>
                <TableCell className="text-foreground-muted">
                  {event.venue?.name || "—"}
                </TableCell>
                <TableCell>
                  {new Date(event.start_time).toLocaleDateString()}
                </TableCell>
                <TableCell>{event.registrations}</TableCell>
                <TableCell>{event.checkins}</TableCell>
                <TableCell>
                  {getApprovalBadge(event.venue_approval_status, event.venue_rejection_reason)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(event.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
