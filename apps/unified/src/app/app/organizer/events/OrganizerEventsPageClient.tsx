"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, Tabs, TabsList, TabsTrigger } from "@crowdstack/ui";
import { Plus, Calendar, AlertCircle, Clock, History, MapPin, ArrowUpRight, CheckCircle2, DollarSign, Lock, List, Grid3x3, Users, UserCheck, Search, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { EventCard } from "@/components/events/EventCard";
import { EventsCalendarView } from "@/components/events/EventsCalendarView";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  closed_at: string | null;
  venue_approval_status: string;
  venue_rejection_reason: string | null;
  registrations: number;
  checkins: number;
  payouts_pending: number;
  payouts_paid: number;
  flier_url: string | null;
  cover_image_url: string | null;
  max_guestlist_size: number | null;
  venue: any | null;
  organizer: any | null;
}

interface OrganizerEventsPageClientProps {
  initialEvents: Event[];
}

export function OrganizerEventsPageClient({ initialEvents }: OrganizerEventsPageClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"cards" | "list" | "calendar">("cards");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Categorize events
  const { liveEvents, upcomingEvents, pastEvents, pendingEvents, rejectedEvents } = useMemo(() => {
    const now = new Date();
    const live: Event[] = [];
    const upcoming: Event[] = [];
    const past: Event[] = [];
    const pending: Event[] = [];
    const rejected: Event[] = [];

    initialEvents.forEach((event) => {
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // Track pending/rejected separately for alerts
      if (event.venue_approval_status === "pending") {
        pending.push(event);
      }
      if (event.venue_approval_status === "rejected") {
        rejected.push(event);
      }

      // Categorize by time
      if (startTime <= now && (!endTime || endTime >= now) && event.status === "published") {
        live.push(event);
      } else if (startTime > now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    // Sort upcoming by start time ascending
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    // Sort past by start time descending
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return { liveEvents: live, upcomingEvents: upcoming, pastEvents: past, pendingEvents: pending, rejectedEvents: rejected };
  }, [initialEvents]);

  // Filter events for list/calendar view
  const filteredEvents = useMemo(() => {
    let filtered = initialEvents;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.venue?.name && event.venue.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Tab filter
    if (activeTab === "live") {
      filtered = filtered.filter((event) => liveEvents.some((e) => e.id === event.id));
    } else if (activeTab === "upcoming") {
      filtered = filtered.filter((event) => upcomingEvents.some((e) => e.id === event.id));
    } else if (activeTab === "past") {
      filtered = filtered.filter((event) => pastEvents.some((e) => e.id === event.id));
    } else if (activeTab === "pending") {
      filtered = filtered.filter((event) => event.venue_approval_status === "pending");
    } else if (activeTab === "rejected") {
      filtered = filtered.filter((event) => event.venue_approval_status === "rejected");
    }

    return filtered;
  }, [initialEvents, searchQuery, activeTab, liveEvents, upcomingEvents, pastEvents]);

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

  const getApprovalBadge = (status: string | null) => {
    if (!status) return null;
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Events</h1>
          <p className="text-sm text-secondary">
            Manage and track all events you've created
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
        <Card className="border-accent-warning/30 bg-accent-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-accent-warning">
                {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} pending venue approval
              </p>
              <p className="text-sm text-secondary mt-1">
                These events are waiting to be approved by their respective venues before they can go live.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Rejected Events Alert */}
      {rejectedEvents.length > 0 && (
        <Card className="border-accent-error/30 bg-accent-error/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-accent-error">
                {rejectedEvents.length} event{rejectedEvents.length > 1 ? "s" : ""} rejected
              </p>
              <p className="text-sm text-secondary mt-1">
                These events were not approved by the venue. You can edit and try a different venue.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* View Toggle and Filters */}
      {initialEvents.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="live">
                Live {liveEvents.length > 0 && `(${liveEvents.length})`}
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming {upcomingEvents.length > 0 && `(${upcomingEvents.length})`}
              </TabsTrigger>
              <TabsTrigger value="past">
                Past {pastEvents.length > 0 && `(${pastEvents.length})`}
              </TabsTrigger>
              {pendingEvents.length > 0 && (
                <TabsTrigger value="pending">
                  Pending ({pendingEvents.length})
                </TabsTrigger>
              )}
              {rejectedEvents.length > 0 && (
                <TabsTrigger value="rejected">
                  Rejected ({rejectedEvents.length})
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center gap-1 p-1 bg-glass rounded-lg border border-border-subtle">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "cards"
                    ? "bg-active text-primary"
                    : "text-secondary hover:text-primary"
                }`}
                title="Card view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-active text-primary"
                    : "text-secondary hover:text-primary"
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "calendar"
                    ? "bg-active text-primary"
                    : "text-secondary hover:text-primary"
                }`}
                title="Calendar view"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {initialEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-secondary" />}
          title="No events yet"
          description="Create your first event to start tracking attendance and managing promoters."
          action={{
            label: "Create Event",
            href: "/app/organizer/events/new"
          }}
        />
      ) : viewMode === "calendar" ? (
        <EventsCalendarView
          events={filteredEvents}
          getStatusBadge={getStatusBadge}
          getApprovalBadge={getApprovalBadge}
          onEventClick={(eventId) => router.push(`/app/organizer/events/${eventId}`)}
        />
      ) : viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-secondary">No events found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    hover
                    className="cursor-pointer"
                    onClick={() => router.push(`/app/organizer/events/${event.id}`)}
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
                          <div className="text-xs text-secondary mt-0.5 truncate">{event.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.venue ? (
                        <div className="text-sm text-primary">{event.venue.name}</div>
                      ) : (
                        <span className="text-xs text-secondary">—</span>
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
                        {event.max_guestlist_size && (
                          <span className="text-secondary">/ {event.max_guestlist_size}</span>
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
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Live Events Section */}
          {liveEvents.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-accent-error rounded-full animate-pulse flex-shrink-0 mt-0.5" />
                  <h2 className="section-header !mb-0">Live Now</h2>
                </div>
                <Badge variant="danger" className="!text-[10px]">{liveEvents.length} Active</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liveEvents.map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur opacity-30 animate-pulse" />
                    <div className="relative">
                      <EventCard
                        event={event}
                        onClick={() => router.push(`/app/organizer/events/${event.id}`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Events Section */}
          {upcomingEvents.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent-secondary flex-shrink-0 mt-0.5" />
                  <h2 className="section-header !mb-0">Upcoming Events</h2>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  ({upcomingEvents.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => router.push(`/app/organizer/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Events Section - Row View */}
          {pastEvents.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                  <h2 className="section-header !mb-0">Event History</h2>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  ({pastEvents.length})
                </span>
              </div>
              <div className="space-y-2">
                {pastEvents.map((event) => {
                  const eventDate = new Date(event.start_time);
                  const conversionRate = event.registrations > 0
                    ? Math.round((event.checkins / event.registrations) * 100)
                    : 0;

                  // Determine lifecycle status
                  const isClosed = !!event.closed_at;
                  const totalPayouts = event.payouts_pending + event.payouts_paid;
                  const allPaid = totalPayouts > 0 && event.payouts_pending === 0;
                  const hasPendingPayouts = event.payouts_pending > 0;

                  // Status badge logic
                  let statusBadge = null;
                  if (allPaid) {
                    statusBadge = (
                      <Badge variant="success" className="!text-[9px] !px-1.5 !py-0 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Paid
                      </Badge>
                    );
                  } else if (hasPendingPayouts) {
                    statusBadge = (
                      <Badge variant="warning" className="!text-[9px] !px-1.5 !py-0 flex items-center gap-0.5">
                        <DollarSign className="h-2.5 w-2.5" />
                        {event.payouts_pending} unpaid
                      </Badge>
                    );
                  } else if (isClosed) {
                    statusBadge = (
                      <Badge variant="secondary" className="!text-[9px] !px-1.5 !py-0 flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" />
                        Closed
                      </Badge>
                    );
                  } else {
                    statusBadge = (
                      <Badge variant="secondary" className="!text-[9px] !px-1.5 !py-0">
                        Ended
                      </Badge>
                    );
                  }

                  return (
                    <Link
                      key={event.id}
                      href={`/app/organizer/events/${event.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-subtle hover:border-accent-primary/30 hover:bg-active/50 transition-all cursor-pointer group">
                        {/* Thumbnail */}
                        {event.flier_url && (
                          <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
                            <img src={event.flier_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-primary line-clamp-1 group-hover:text-accent-secondary transition-colors">
                              {event.name}
                            </h4>
                            {statusBadge}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-secondary">
                            <Calendar className="h-3 w-3 text-muted flex-shrink-0" />
                            <span>{eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            {event.venue && (
                              <>
                                <span className="text-muted">•</span>
                                <span className="line-clamp-1">{event.venue.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Stats - More Compact */}
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="text-center min-w-[40px]">
                            <span className="text-xs font-bold text-primary">{event.registrations}</span>
                            <p className="font-mono text-[7px] uppercase tracking-widest text-muted">Reg</p>
                          </div>
                          <div className="text-center min-w-[40px]">
                            <span className="text-xs font-bold text-accent-success">{event.checkins}</span>
                            <p className="font-mono text-[7px] uppercase tracking-widest text-muted">In</p>
                          </div>
                          <div className="text-center min-w-[40px]">
                            <span className={`text-xs font-bold ${conversionRate >= 70 ? "text-accent-success" : conversionRate >= 40 ? "text-accent-warning" : "text-secondary"}`}>
                              {conversionRate}%
                            </span>
                            <p className="font-mono text-[7px] uppercase tracking-widest text-muted">Conv</p>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ArrowUpRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

