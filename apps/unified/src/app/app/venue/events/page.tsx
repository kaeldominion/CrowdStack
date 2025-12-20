"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  Button, 
  Badge, 
  Table, 
  TableHeader, 
  TableBody,
  LoadingSpinner, 
  TableRow, 
  TableHead, 
  TableCell,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@crowdstack/ui";
import { 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  UserCheck,
  X,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  status: string;
  venue_approval_status: string | null;
  venue_approval_at: string | null;
  registrations: number;
  checkins: number;
  organizer: {
    id: string;
    name: string;
    email: string | null;
  };
}

export default function VenueEventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizerFilterId = searchParams.get("organizer");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filteredOrganizer, setFilteredOrganizer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    // If organizer filter is in URL, find and set the organizer info
    if (organizerFilterId && events.length > 0) {
      const organizer = events.find(e => e.organizer.id === organizerFilterId)?.organizer;
      if (organizer) {
        setFilteredOrganizer({ id: organizer.id, name: organizer.name });
      }
    } else {
      setFilteredOrganizer(null);
    }
  }, [organizerFilterId, events]);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/venue/events");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getApprovalBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Pending
          </Badge>
        );
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

  // Filter events
  const filteredEvents = events.filter((event) => {
    // Organizer filter
    if (organizerFilterId && event.organizer.id !== organizerFilterId) {
      return false;
    }
    
    // Search filter
    const matchesSearch = 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organizer.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tab filter
    let matchesTab = true;
    if (activeTab === "pending") {
      matchesTab = event.venue_approval_status === "pending";
    } else if (activeTab === "approved") {
      matchesTab = event.venue_approval_status === "approved";
    } else if (activeTab === "upcoming") {
      matchesTab = new Date(event.start_time) > new Date();
    } else if (activeTab === "past") {
      matchesTab = new Date(event.start_time) <= new Date();
    }

    return matchesSearch && matchesTab;
  });

  const clearOrganizerFilter = () => {
    router.push("/app/venue/events");
  };

  // Count for tabs
  const pendingCount = events.filter(e => e.venue_approval_status === "pending").length;
  const approvedCount = events.filter(e => e.venue_approval_status === "approved").length;
  const upcomingCount = events.filter(e => new Date(e.start_time) > new Date()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            Events at Your Venue
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Manage and track all events hosted at your venue
          </p>
        </div>
        {pendingCount > 0 && (
          <Link href="/app/venue/events/pending">
            <Button variant="primary">
              <ShieldAlert className="h-4 w-4 mr-2" />
              {pendingCount} Pending Approval{pendingCount > 1 ? "s" : ""}
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-foreground-muted">Total Events</div>
          <div className="text-3xl font-bold text-foreground mt-1">{events.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-foreground-muted">Pending Approval</div>
          <div className="text-3xl font-bold text-warning mt-1">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-foreground-muted">Approved</div>
          <div className="text-3xl font-bold text-success mt-1">{approvedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-foreground-muted">Upcoming</div>
          <div className="text-3xl font-bold text-primary mt-1">{upcomingCount}</div>
        </Card>
      </div>

      {/* Organizer Filter Badge */}
      {filteredOrganizer && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                Showing events from <strong>{filteredOrganizer.name}</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOrganizerFilter}
              className="text-foreground-muted hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filter
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs and Search */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>

            <Input
              placeholder="Search events or organizers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </Tabs>

        {/* Events Table */}
        {filteredEvents.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-foreground-muted mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Events Found
              </h3>
              <p className="text-foreground-muted">
                {filteredOrganizer
                  ? `No events found for ${filteredOrganizer.name}.`
                  : activeTab === "pending" 
                  ? "No events are waiting for your approval."
                  : searchQuery 
                  ? "No events match your search."
                  : "No events have been created at your venue yet."}
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Check-ins</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow 
                    key={event.id} 
                    hover 
                    className="cursor-pointer"
                    onClick={() => router.push(`/app/venue/events/${event.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{event.name}</div>
                      <div className="text-xs text-foreground-muted">{event.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground">{event.organizer.name}</div>
                      {event.organizer.email && (
                        <div className="text-xs text-foreground-muted">{event.organizer.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-foreground-muted">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">{formatDate(event.start_time)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-foreground-muted" />
                        <span>{event.registrations}</span>
                        {event.capacity && (
                          <span className="text-foreground-muted">/ {event.capacity}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <UserCheck className="h-4 w-4 text-success" />
                        <span>{event.checkins}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getApprovalBadge(event.venue_approval_status)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(event.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
