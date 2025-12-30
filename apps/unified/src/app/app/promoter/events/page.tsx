"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, LoadingSpinner, Input } from "@crowdstack/ui";
import { Calendar, Search, MapPin, Clock, Send, Check, X, Loader2, Radio, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface MyEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  flier_url: string | null;
  venue_name: string | null;
  referral_link: string;
  registrations: number;
  checkins: number;
  conversionRate: number;
  isLive: boolean;
  isUpcoming: boolean;
  isPast: boolean;
}

interface BrowseEvent {
  id: string;
  name: string;
  slug: string;
  flier_url: string | null;
  cover_image_url: string | null;
  start_time: string;
  end_time: string | null;
  venue: { id: string; name: string; city: string | null } | null;
  organizer: { id: string; name: string } | null;
  promoter_status: "available" | "assigned" | "pending" | "declined";
}

interface PromoterRequest {
  id: string;
  message: string | null;
  status: string;
  response_message: string | null;
  created_at: string;
  event: {
    id: string;
    name: string;
    slug: string;
    flier_url: string | null;
    start_time: string;
    venue: { id: string; name: string } | null;
  };
}

export default function PromoterEventsPage() {
  const [activeTab, setActiveTab] = useState("my-events");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // My Events state
  const [myEvents, setMyEvents] = useState<{
    liveEvents: MyEvent[];
    upcomingEvents: MyEvent[];
    pastEvents: MyEvent[];
  }>({ liveEvents: [], upcomingEvents: [], pastEvents: [] });
  
  // Browse Events state
  const [browseEvents, setBrowseEvents] = useState<BrowseEvent[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  
  // Requests state
  const [requests, setRequests] = useState<PromoterRequest[]>([]);
  
  // UI state
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [requestingEventId, setRequestingEventId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BrowseEvent | null>(null);
  const [requestMessage, setRequestMessage] = useState("");

  // Load my events
  const loadMyEvents = async () => {
    try {
      const response = await fetch("/api/promoter/dashboard-events");
      if (response.ok) {
        const data = await response.json();
        setMyEvents({
          liveEvents: data.liveEvents || [],
          upcomingEvents: data.upcomingEvents || [],
          pastEvents: data.pastEvents || [],
        });
      }
    } catch (error) {
      console.error("Failed to load my events:", error);
    }
  };

  // Load browse events
  const loadBrowseEvents = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      
      const response = await fetch(`/api/promoter/browse-events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBrowseEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to load browse events:", error);
    } finally {
      setBrowseLoading(false);
    }
  }, [search]);

  // Load requests
  const loadRequests = async () => {
    try {
      const response = await fetch("/api/promoter/requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to load requests:", error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([loadMyEvents(), loadRequests()]);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === "find-events") {
      loadBrowseEvents();
    }
  }, [activeTab, loadBrowseEvents]);

  const copyLink = (eventId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedEventId(eventId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  const handleRequestClick = (event: BrowseEvent) => {
    setSelectedEvent(event);
    setRequestMessage("");
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!selectedEvent) return;
    
    setRequestingEventId(selectedEvent.id);
    try {
      const response = await fetch("/api/promoter/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          message: requestMessage.trim() || null,
        }),
      });

      if (response.ok) {
        setBrowseEvents(prev => prev.map(e => 
          e.id === selectedEvent.id 
            ? { ...e, promoter_status: "pending" as const }
            : e
        ));
        await loadRequests();
        setShowRequestModal(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Failed to submit request:", error);
      alert("Failed to submit request");
    } finally {
      setRequestingEventId(null);
    }
  };

  const withdrawRequest = async (requestId: string) => {
    setWithdrawingId(requestId);
    try {
      const response = await fetch("/api/promoter/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action: "withdraw" }),
      });

      if (response.ok) {
        await Promise.all([loadBrowseEvents(), loadRequests()]);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to withdraw request");
      }
    } catch (error) {
      console.error("Failed to withdraw:", error);
    } finally {
      setWithdrawingId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const totalMyEvents = myEvents.liveEvents.length + myEvents.upcomingEvents.length + myEvents.pastEvents.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Events</h1>
        <p className="text-sm text-secondary">
          Manage your promotions and discover new events
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-glass border border-border-subtle">
          <TabsTrigger value="my-events" className="data-[state=active]:bg-active">
            My Events
            {totalMyEvents > 0 && (
              <Badge variant="secondary" className="ml-2 bg-active text-primary text-xs">
                {totalMyEvents}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="find-events" className="data-[state=active]:bg-active">
            Find Events
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-active">
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-accent-warning/20 text-accent-warning text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* MY EVENTS TAB */}
        <TabsContent value="my-events" className="mt-4 space-y-4">
          {totalMyEvents === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">No events yet</h3>
                <p className="text-secondary mb-4">
                  Start by finding events to promote
                </p>
                <Button onClick={() => setActiveTab("find-events")}>
                  <Search className="h-4 w-4 mr-2" />
                  Find Events
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Live Events */}
              {myEvents.liveEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-accent-error rounded-full animate-pulse" />
                    <h3 className="section-header">Live Now</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {myEvents.liveEvents.map((event) => (
                      <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                        <Card className="border-l-4 border-l-accent-error hover:bg-active transition-colors cursor-pointer h-full">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-primary truncate">{event.name}</h4>
                                {event.venue_name && (
                                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.venue_name}
                                  </p>
                                )}
                              </div>
                              <Radio className="h-4 w-4 text-accent-error animate-pulse flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-secondary">{event.registrations} reg</span>
                              <span className="text-accent-success font-medium">{event.checkins} in</span>
                              <span className="text-secondary">{event.conversionRate}%</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded bg-glass border border-border-subtle">
                              <input
                                type="text"
                                value={event.referral_link}
                                readOnly
                                className="flex-1 bg-transparent text-secondary text-xs font-mono truncate"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyLink(event.id, event.referral_link)}
                                className="shrink-0 h-6 w-6 p-0"
                              >
                                {copiedEventId === event.id ? (
                                  <Check className="h-3 w-3 text-accent-success" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Events - List View */}
              {myEvents.upcomingEvents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent-secondary" />
                    Upcoming Events
                  </h3>
                  <div className="space-y-2">
                    {myEvents.upcomingEvents.map((event) => (
                      <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-glass border border-border-subtle hover:bg-active transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            {/* Flier thumbnail */}
                            <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-glass">
                              {event.flier_url ? (
                                <Image
                                  src={event.flier_url}
                                  alt=""
                                  width={48}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Calendar className="h-5 w-5 text-muted" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-primary truncate group-hover:text-accent-secondary transition-colors">{event.name}</p>
                              <div className="flex items-center gap-2 text-xs text-secondary mt-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatShortDate(event.start_time)}</span>
                                {event.venue_name && (
                                  <>
                                    <span>·</span>
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{event.venue_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-medium text-primary">{event.registrations}</p>
                              <p className="text-xs text-muted">referrals</p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-medium text-accent-success">{event.checkins}</p>
                              <p className="text-xs text-muted">check-ins</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(event.id, event.referral_link)}
                              className="h-8 w-8 p-0"
                              title="Copy referral link"
                            >
                              {copiedEventId === event.id ? (
                                <Check className="h-4 w-4 text-accent-success" />
                              ) : (
                                <Copy className="h-4 w-4 text-secondary" />
                              )}
                            </Button>
                            <ExternalLink className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Events */}
              {myEvents.pastEvents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-secondary">Past Events</h3>
                  <div className="space-y-2">
                    {myEvents.pastEvents.slice(0, 5).map((event) => (
                      <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-glass border border-border-subtle hover:bg-active transition-colors cursor-pointer group opacity-75">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-glass">
                              {event.flier_url ? (
                                <Image
                                  src={event.flier_url}
                                  alt=""
                                  width={40}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-muted" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-primary truncate group-hover:text-accent-secondary transition-colors">{event.name}</p>
                              <p className="text-xs text-muted">{formatShortDate(event.start_time)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-right">
                              <p className="text-secondary">{event.checkins}/{event.registrations}</p>
                              <p className="text-muted">{event.conversionRate}% conv</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* FIND EVENTS TAB */}
        <TabsContent value="find-events" className="mt-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <Input
              type="text"
              placeholder="Search events by name or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Events Grid */}
          {browseLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : browseEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
              <p className="text-secondary">No upcoming events found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {browseEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-glass border border-border-subtle rounded-xl overflow-hidden hover:border-accent-primary/30 transition-all group"
                >
                  {/* Clickable Event Image */}
                  <Link href={`/e/${event.slug}`} target="_blank" className="block">
                    <div className="relative aspect-[4/3] bg-void group-hover:opacity-90 transition-opacity">
                      {event.flier_url || event.cover_image_url ? (
                        <Image
                          src={event.flier_url || event.cover_image_url || ""}
                          alt={event.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Calendar className="h-12 w-12 text-muted" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      {event.promoter_status !== "available" && (
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant={
                              event.promoter_status === "assigned"
                                ? "success"
                                : event.promoter_status === "pending"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {event.promoter_status === "assigned" && (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Promoting
                              </>
                            )}
                            {event.promoter_status === "pending" && (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                            {event.promoter_status === "declined" && "Declined"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Event Details */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-primary text-lg line-clamp-1">
                      {event.name}
                    </h3>

                    <div className="space-y-1.5 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {event.venue.name}
                            {event.venue.city && `, ${event.venue.city}`}
                          </span>
                        </div>
                      )}
                      {event.organizer && (
                        <div className="flex items-center gap-2 text-xs text-muted">
                          by {event.organizer.name}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {event.promoter_status === "available" && (
                        <Button
                          onClick={() => handleRequestClick(event)}
                          disabled={requestingEventId === event.id}
                          className="w-full"
                        >
                          {requestingEventId === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Request to Promote
                        </Button>
                      )}
                      {event.promoter_status === "assigned" && (
                        <Link href={`/app/promoter/events/${event.id}`}>
                          <Button variant="secondary" className="w-full">
                            Manage Promotion
                          </Button>
                        </Link>
                      )}
                      {event.promoter_status === "pending" && (
                        <div className="text-center text-sm text-accent-warning py-2">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Awaiting Response
                        </div>
                      )}
                      {event.promoter_status === "declined" && (
                        <div className="text-center text-sm text-accent-error py-2">
                          Request Declined
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REQUESTS TAB */}
        <TabsContent value="requests" className="mt-6 space-y-6">
          {requests.length === 0 ? (
            <Card className="bg-glass border-border-subtle">
              <div className="p-8 text-center">
                <Send className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">No requests yet</h3>
                <p className="text-secondary mb-4">
                  Find events and submit requests to promote them
                </p>
                <Button onClick={() => setActiveTab("find-events")}>
                  <Search className="h-4 w-4 mr-2" />
                  Find Events
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="bg-glass border-border-subtle">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {request.event?.flier_url && (
                        <Image
                          src={request.event.flier_url}
                          alt=""
                          width={60}
                          height={60}
                          className="rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-primary">{request.event?.name}</h4>
                            {request.event?.venue && (
                              <p className="text-sm text-secondary mt-0.5">{request.event.venue.name}</p>
                            )}
                            <p className="text-xs text-muted mt-1">
                              {formatShortDate(request.event?.start_time || "")}
                            </p>
                          </div>
                          <Badge
                            variant={
                              request.status === "pending"
                                ? "warning"
                                : request.status === "approved"
                                ? "success"
                                : "danger"
                            }
                            className={
                              request.status === "pending"
                                ? "bg-accent-warning/20 text-accent-warning"
                                : request.status === "approved"
                                ? "bg-accent-success/20 text-accent-success"
                                : "bg-accent-error/20 text-accent-error"
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {request.message && (
                          <p className="text-sm text-primary mt-2 line-clamp-2">
                            &ldquo;{request.message}&rdquo;
                          </p>
                        )}
                        
                        {request.response_message && (
                          <div className="mt-2 p-2 bg-glass rounded text-sm text-secondary">
                            <span className="text-xs text-muted">Response: </span>
                            {request.response_message}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted mt-2">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {request.status === "pending" && (
                      <div className="mt-4 pt-4 border-t border-border-subtle flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => withdrawRequest(request.id)}
                          disabled={withdrawingId === request.id}
                          className="text-secondary hover:text-accent-error"
                        >
                          {withdrawingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Withdraw Request
                        </Button>
                      </div>
                    )}
                    
                    {request.status === "approved" && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <Link href={`/app/promoter/events/${request.event?.id}`}>
                          <Button size="sm" className="w-full">
                            View Event
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request Modal */}
      {showRequestModal && selectedEvent && (
        <div className="fixed inset-0 bg-void/60 backdrop-blur-glass flex items-center justify-center z-50 p-4">
          <div className="bg-raised border border-border-strong rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-semibold text-primary">
              Request to Promote
            </h3>
            
            <div className="flex items-center gap-3 bg-glass rounded-lg p-3">
              {selectedEvent.flier_url && (
                <Image
                  src={selectedEvent.flier_url}
                  alt=""
                  width={60}
                  height={60}
                  className="rounded object-cover"
                />
              )}
              <div>
                <p className="text-primary font-medium">{selectedEvent.name}</p>
                <p className="text-secondary text-sm">
                  {formatDate(selectedEvent.start_time)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-2">
                Message to organizer (optional)
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Introduce yourself, share your experience, or explain why you'd be a great promoter for this event..."
                className="w-full h-32 bg-raised border border-border-subtle rounded-lg p-3 text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
              />
            </div>

            <p className="text-xs text-muted">
              The event organizer will review your request and may contact you to discuss terms.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowRequestModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitRequest}
                disabled={requestingEventId === selectedEvent.id}
                className="flex-1"
              >
                {requestingEventId === selectedEvent.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
