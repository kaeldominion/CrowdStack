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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Events at Your Venue</h1>
          <p className="text-sm text-secondary">
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
      <div className="grid grid-cols-4 gap-2">
        <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5 truncate">Tot. Events</p>
          <p className="font-sans text-lg font-bold tracking-tight text-primary">{events.length}</p>
        </Card>
        <Card className="border-accent-warning/30 bg-accent-warning/5 [&>div]:!px-3 [&>div]:!py-2.5">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5 truncate">Pending</p>
          <p className="font-sans text-lg font-bold tracking-tight text-accent-warning">{pendingCount}</p>
        </Card>
        <Card className="border-accent-success/30 bg-accent-success/5 [&>div]:!px-3 [&>div]:!py-2.5">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5 truncate">Approved</p>
          <p className="font-sans text-lg font-bold tracking-tight text-accent-success">{approvedCount}</p>
        </Card>
        <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5 truncate">Upcoming</p>
          <p className="font-sans text-lg font-bold tracking-tight text-primary">{upcomingCount}</p>
        </Card>
      </div>

      {/* Organizer Filter Badge */}
      {filteredOrganizer && (
        <div className="p-4 rounded-xl bg-glass border border-accent-secondary/20 bg-accent-secondary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">
                Showing events from <strong>{filteredOrganizer.name}</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOrganizerFilter}
              className="text-secondary hover:text-primary"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filter
            </Button>
          </div>
        </div>
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
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-secondary mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                No Events Found
              </h3>
              <p className="text-sm text-secondary">
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
                      <div className="font-sans font-semibold text-primary">{event.name}</div>
                      <div className="text-xs text-secondary mt-0.5">{event.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-primary">{event.organizer.name}</div>
                      {event.organizer.email && (
                        <div className="text-xs text-secondary mt-0.5">{event.organizer.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-secondary">
                        <Clock className="h-3 w-3 text-muted" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <Users className="h-4 w-4 text-muted" />
                        <span>{event.registrations}</span>
                        {event.capacity && (
                          <span className="text-secondary">/ {event.capacity}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <UserCheck className="h-4 w-4 text-accent-success" />
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
