"use client";

import { useState, useEffect } from "react";
import { 
  Button, 
  Badge, 
  Table, 
  TableHeader, 
  TableBody,
  LoadingSpinner, 
  TableRow, 
  TableHead, 
  TableCell,
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
  Plus,
  List,
  Grid3x3,
  CheckCircle2,
  DollarSign,
  Lock,
  Filter,
  ChevronDown,
  UtensilsCrossed,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EventsCalendarView } from "@/components/events/EventsCalendarView";

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
  flier_url: string | null;
  cover_image_url: string | null;
  owner_user_id: string | null;
  closed_at: string | null;
  payouts_pending: number;
  payouts_paid: number;
  table_bookings: number;
  feedback_count: number;
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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filteredOrganizer, setFilteredOrganizer] = useState<{ id: string; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "venue" | "organizer">("all");
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>(organizerFilterId || "");

  useEffect(() => {
    loadEvents();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch("/api/me/profile");
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.profile?.id || null);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  };

  useEffect(() => {
    // Sync selectedOrganizerId with URL param
    if (organizerFilterId) {
      setSelectedOrganizerId(organizerFilterId);
    } else {
      setSelectedOrganizerId("");
    }

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

  const getApprovalIcon = (status: string | null) => {
    switch (status) {
      case "pending":
        return (
          <ShieldAlert className="h-4 w-4 text-[var(--accent-warning)]" />
        );
      case "approved":
        return (
          <ShieldCheck className="h-4 w-4 text-[var(--accent-success)]" />
        );
      case "rejected":
        return (
          <ShieldX className="h-4 w-4 text-[var(--accent-error)]" />
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string, event: Event) => {
    const isVenueOwnedEvent = isVenueOwned(event);
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const isPast = eventStart <= now;
    const isUpcoming = eventStart > now;

    // For venue owned events, show lifecycle status (closeout workflow)
    if (isVenueOwnedEvent) {
      const isClosed = !!event.closed_at;
      const totalPayouts = event.payouts_pending + event.payouts_paid;
      const allPaid = totalPayouts > 0 && event.payouts_pending === 0;
      const hasPendingPayouts = event.payouts_pending > 0;

      if (allPaid) {
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        );
      } else if (hasPendingPayouts) {
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {event.payouts_pending} unpaid
          </Badge>
        );
      } else if (isClosed) {
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Closed
          </Badge>
        );
      } else if (isPast) {
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Needs Closeout
          </Badge>
        );
      } else if (isUpcoming) {
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Upcoming
          </Badge>
        );
      }
    }

    // For organizer owned events, show status with lifecycle context
    if (isPast) {
      if (status === "published") {
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ended
          </Badge>
        );
      }
    }

    // Default status badges
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return isUpcoming ? (
          <Badge variant="success">Published</Badge>
        ) : (
          <Badge variant="secondary">Ended</Badge>
        );
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get unique organizers for filter dropdown
  const uniqueOrganizers = Array.from(
    new Map(events.map(e => [e.organizer.id, e.organizer])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Determine if event is venue owned
  // If owner_user_id is set, it means a venue user created it (venue owned)
  // If owner_user_id is null, an organizer created it (organizer owned)
  const isVenueOwned = (event: Event) => {
    return !!event.owner_user_id;
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    // Ownership filter
    if (ownershipFilter === "venue" && !isVenueOwned(event)) {
      return false;
    }
    if (ownershipFilter === "organizer" && isVenueOwned(event)) {
      return false;
    }

    // Organizer filter (from URL or dropdown)
    const activeOrganizerFilter = organizerFilterId || selectedOrganizerId;
    if (activeOrganizerFilter && event.organizer.id !== activeOrganizerFilter) {
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
  const venueOwnedCount = events.filter(e => isVenueOwned(e)).length;
  const organizerOwnedCount = events.filter(e => !isVenueOwned(e)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[var(--accent-secondary)]" />
            Events
          </h1>
          <p className="page-description">
            Manage and track all events hosted at your venue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/venue/events/new">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Event
            </Button>
          </Link>
          {pendingCount > 0 && (
            <Link href="/app/venue/events/pending">
              <Button variant="primary" size="sm">
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                {pendingCount} Pending
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2">
        <div className="stat-chip">
          <span className="stat-chip-value">{events.length}</span>
          <span className="stat-chip-label">Total</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value text-[var(--accent-primary)]">{venueOwnedCount}</span>
          <span className="stat-chip-label">Venue Owned</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value text-[var(--accent-secondary)]">{organizerOwnedCount}</span>
          <span className="stat-chip-label">Organizer</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value text-[var(--accent-warning)]">{pendingCount}</span>
          <span className="stat-chip-label">Pending</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value text-[var(--accent-success)]">{approvedCount}</span>
          <span className="stat-chip-label">Approved</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value">{upcomingCount}</span>
          <span className="stat-chip-label">Upcoming</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Ownership Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <div className="flex items-center gap-1">
            {[
              { value: "all", label: "All" },
              { value: "venue", label: "Venue Owned" },
              { value: "organizer", label: "Organizer" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setOwnershipFilter(filter.value as typeof ownershipFilter)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                  ownershipFilter === filter.value
                    ? "bg-[var(--accent-primary)] text-[var(--bg-void)]"
                    : "bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Organizer Filter Dropdown */}
        {ownershipFilter !== "venue" && uniqueOrganizers.length > 0 && (
          <div className="relative">
            <select
              value={selectedOrganizerId}
              onChange={(e) => {
                setSelectedOrganizerId(e.target.value);
                if (e.target.value) {
                  router.push(`/app/venue/events?organizer=${e.target.value}`);
                } else {
                  router.push("/app/venue/events");
                }
              }}
              className="pl-8 pr-8 py-1.5 text-xs bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-secondary)] appearance-none cursor-pointer"
            >
              <option value="">All Organizers</option>
              {uniqueOrganizers.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-muted)] pointer-events-none" />
          </div>
        )}

        {/* Active Filter Badge */}
        {(filteredOrganizer || selectedOrganizerId) && (
          <div className="px-2.5 py-1.5 bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/20 rounded-lg flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-[var(--accent-secondary)]" />
            <span className="text-xs text-[var(--text-primary)]">
              {filteredOrganizer?.name || uniqueOrganizers.find(o => o.id === selectedOrganizerId)?.name}
            </span>
            <button
              onClick={() => {
                setSelectedOrganizerId("");
                clearOrganizerFilter();
              }}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs and Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            {[
              { value: "all", label: "All" },
              { value: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
              { value: "approved", label: "Approved" },
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                  activeTab === tab.value
                    ? "bg-[var(--accent-primary)] text-[var(--bg-void)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-secondary)] w-40"
              />
            </div>
            <div className="flex items-center gap-0.5 p-0.5 bg-[var(--bg-glass)] rounded-lg border border-[var(--border-subtle)]">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "calendar"
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Calendar view"
              >
                <Calendar className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Events View */}
        {filteredEvents.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <Calendar className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">
              {filteredOrganizer
                ? `No events found for ${filteredOrganizer.name}.`
                : activeTab === "pending" 
                ? "No events are waiting for your approval."
                : searchQuery 
                ? "No events match your search."
                : "No events have been created at your venue yet."}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="glass-panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reg/Check</TableHead>
                  <TableHead>Tables</TableHead>
                  <TableHead>Feedback</TableHead>
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
                      <div className="flex items-center gap-2.5">
                        {(event.flier_url || event.cover_image_url) && (
                          <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
                            <Image
                              src={event.flier_url || event.cover_image_url || ""}
                              alt={event.name}
                              width={40}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-sans font-semibold text-primary truncate">{event.name}</div>
                          <div className="mt-0.5">
                            {isVenueOwned(event) ? (
                              <Badge variant="primary" className="text-[9px] px-1 py-0">Venue</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">Organizer</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-primary">{event.organizer.name}</div>
                      {event.organizer.email && (
                        <div className="text-xs text-secondary mt-0.5">{event.organizer.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="text-[var(--text-primary)]">
                          {new Date(event.start_time).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[var(--text-muted)] mt-0.5">
                          {new Date(event.start_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono text-[var(--text-primary)]">
                        <span>{event.checkins}</span>
                        <span className="text-[var(--text-muted)]">/</span>
                        <span>{event.registrations}</span>
                        {event.capacity && (
                          <span className="text-[var(--text-muted)] text-xs"> / {event.capacity}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-mono text-[var(--text-primary)]">
                        <UtensilsCrossed className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <span>{event.table_bookings || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-mono text-[var(--text-primary)]">
                        <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <span>{event.feedback_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getApprovalIcon(event.venue_approval_status)}
                        {getStatusBadge(event.status, event)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EventsCalendarView
            events={filteredEvents.map(e => ({
              id: e.id,
              name: e.name,
              slug: e.slug,
              start_time: e.start_time,
              end_time: e.end_time,
              status: e.status,
              venue_approval_status: e.venue_approval_status,
              flier_url: e.flier_url,
              cover_image_url: e.cover_image_url,
              registrations: e.registrations,
              checkins: e.checkins,
              organizer: e.organizer,
            }))}
            getStatusBadge={(status, event) => {
              const fullEvent = filteredEvents.find(e => e.id === event?.id);
              return fullEvent ? getStatusBadge(status, fullEvent) : null;
            }}
            getApprovalBadge={(status) => {
              const icon = getApprovalIcon(status);
              return icon ? <div className="flex items-center justify-center">{icon}</div> : null;
            }}
            onEventClick={(eventId) => router.push(`/app/venue/events/${eventId}`)}
          />
        )}
      </div>
    </div>
  );
}
