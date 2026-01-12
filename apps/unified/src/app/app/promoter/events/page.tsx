"use client";

import { useState, useEffect } from "react";
import { Card, Button, LoadingSpinner } from "@crowdstack/ui";
import { Calendar, MapPin, Clock, Check, Copy, ExternalLink, Radio } from "lucide-react";
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


export default function PromoterEventsPage() {
  const [loading, setLoading] = useState(true);
  
  // My Events state
  const [myEvents, setMyEvents] = useState<{
    liveEvents: MyEvent[];
    upcomingEvents: MyEvent[];
    pastEvents: MyEvent[];
  }>({ liveEvents: [], upcomingEvents: [], pastEvents: [] });
  
  // UI state
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

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


  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await loadMyEvents();
      setLoading(false);
    };
    loadInitialData();
  }, []);

  const copyLink = (eventId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedEventId(eventId);
    setTimeout(() => setCopiedEventId(null), 2000);
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

      {/* Events List */}
      <div className="space-y-4">
          {totalMyEvents === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">No events yet</h3>
                <p className="text-secondary mb-4">
                  You'll see events here once you're assigned as a promoter
                </p>
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
      </div>
    </div>
  );
}
