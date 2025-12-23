"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LoadingSpinner } from "@crowdstack/ui";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  QrCode,
  Share2,
  History,
  CheckCircle2,
  XCircle,
  X,
  Copy,
  Check,
} from "lucide-react";

interface Registration {
  id: string;
  event_id: string;
  registered_at: string;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    cover_image_url: string | null;
    flier_url?: string | null;
    venue?: {
      name: string;
      city: string | null;
    } | null;
  } | null;
  checkins?: { checked_in_at: string }[];
}

export default function MyEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Get attendee
      const { data: attendee } = await supabase
        .from("attendees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!attendee) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Get all registrations with events
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select(`
          id,
          event_id,
          registered_at,
          event:events(
            id,
            name,
            slug,
            start_time,
            end_time,
            cover_image_url,
            flier_url,
            venue:venues(name, city)
          ),
          checkins(checked_in_at)
        `)
        .eq("attendee_id", attendee.id)
        .order("registered_at", { ascending: false });

      if (regError) {
        console.error("[MyEvents] Error loading registrations:", regError);
      }

      if (registrations) {
        const normalized = registrations
          .map((reg: any) => ({
            ...reg,
            event: Array.isArray(reg.event) ? reg.event[0] : reg.event,
          }))
          .map((reg: any) => ({
            ...reg,
            event: reg.event ? {
              ...reg.event,
              venue: Array.isArray(reg.event.venue) ? reg.event.venue[0] : reg.event.venue,
            } : null,
          }))
          .filter((reg: any) => reg.event !== null);

        setEvents(normalized);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Categorize events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    const upcoming: Registration[] = [];
    const past: Registration[] = [];

    events.forEach((reg) => {
      if (!reg.event) return;
      const startTime = new Date(reg.event.start_time);
      const endTime = reg.event.end_time ? new Date(reg.event.end_time) : null;

      // For events without end_time, consider them "past" if they started more than 24 hours ago
      const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const hasEnded = endTime
        ? endTime < now
        : startTime < hoursAgo24;

      if (hasEnded) {
        past.push(reg);
      } else {
        upcoming.push(reg);
      }
    });

    // Sort upcoming by start time ascending
    upcoming.sort((a, b) => {
      const aTime = new Date(a.event?.start_time || 0).getTime();
      const bTime = new Date(b.event?.start_time || 0).getTime();
      return aTime - bTime;
    });

    // Sort past by start time descending
    past.sort((a, b) => {
      const aTime = new Date(a.event?.start_time || 0).getTime();
      const bTime = new Date(b.event?.start_time || 0).getTime();
      return bTime - aTime;
    });

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  // Group past events by year
  const pastEventsByYear = useMemo(() => {
    const grouped: Record<number, Registration[]> = {};
    pastEvents.forEach((reg) => {
      if (!reg.event) return;
      const year = new Date(reg.event.start_time).getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(reg);
    });
    return grouped;
  }, [pastEvents]);

  const years = Object.keys(pastEventsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getReferralLink = (eventSlug: string) => {
    if (!userId) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/e/${eventSlug}?ref=${userId}`;
  };

  const handleShare = async (eventSlug: string, eventName: string) => {
    const link = getReferralLink(eventSlug);
    if (!link || !userId) {
      // Fallback to non-referral link if userId not available
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fallbackLink = `${origin}/e/${eventSlug}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: eventName,
            text: `Check out ${eventName}!`,
            url: fallbackLink,
          });
        } catch (error) {
          // User cancelled or share failed
        }
      } else {
        await navigator.clipboard.writeText(fallbackLink);
        setCopiedEventId(eventSlug);
        setTimeout(() => setCopiedEventId(null), 2000);
      }
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: eventName,
          text: `Check out ${eventName}!`,
          url: link,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback to copy
      await navigator.clipboard.writeText(link);
      setCopiedEventId(eventSlug);
      setTimeout(() => setCopiedEventId(null), 2000);
    }
  };

  const handleCopyLink = async (eventSlug: string) => {
    const link = getReferralLink(eventSlug);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const linkToCopy = link || `${origin}/e/${eventSlug}`;
    await navigator.clipboard.writeText(linkToCopy);
    setCopiedEventId(eventSlug);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  const handleDeregister = async (eventSlug: string, registrationId: string) => {
    if (!confirm("Are you sure you want to deregister from this event? This action cannot be undone.")) {
      return;
    }

    setDeregisteringId(registrationId);
    try {
      const response = await fetch(`/api/events/by-slug/${eventSlug}/deregister`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Reload events
        await loadEvents();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to deregister. Please try again.");
      }
    } catch (error) {
      console.error("Error deregistering:", error);
      alert("Failed to deregister. Please try again.");
    } finally {
      setDeregisteringId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Events
          </h1>
          <p className="mt-2 text-white/60">
            {upcomingEvents.length + pastEvents.length} event{upcomingEvents.length + pastEvents.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {/* Upcoming Events Section */}
        {upcomingEvents.length > 0 && (
          <section className="mb-12 space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
              <span className="text-sm text-white/60">({upcomingEvents.length})</span>
            </div>

            <div className="space-y-3">
              {upcomingEvents.map((reg) => {
                if (!reg.event) return null;
                return (
                  <div
                    key={reg.id}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
                  >
                    <Link
                      href={`/e/${reg.event.slug}`}
                      className="block hover:bg-white/5 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Event Image or Placeholder */}
                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {(reg.event.flier_url || reg.event.cover_image_url) ? (
                            <img
                              src={reg.event.flier_url || reg.event.cover_image_url || ""}
                              alt={reg.event.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Ticket className="h-8 w-8 text-white/40" />
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                            {reg.event.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatEventDate(reg.event.start_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatEventTime(reg.event.start_time)}
                            </span>
                          </div>
                          {reg.event.venue && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-white/40">
                              <MapPin className="h-3.5 w-3.5" />
                              {reg.event.venue.name}
                              {reg.event.venue.city && `, ${reg.event.venue.city}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4 flex gap-2">
                      <Link
                        href={`/e/${reg.event.slug}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all text-sm"
                      >
                        <QrCode className="h-4 w-4" />
                        View Ticket
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleShare(reg.event!.slug, reg.event!.name);
                        }}
                        className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                        title="Share event"
                      >
                        {copiedEventId === reg.event.slug ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Share2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeregister(reg.event!.slug, reg.id);
                        }}
                        disabled={deregisteringId === reg.id}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center"
                        title="Deregister from event"
                      >
                        {deregisteringId === reg.id ? (
                          <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Past Events Section */}
        {pastEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-white/60" />
              <h2 className="text-xl font-semibold text-white">Event History</h2>
              <span className="text-sm text-white/60">({pastEvents.length})</span>
            </div>

            {years.length > 0 ? (
              <div className="space-y-8">
                {years.map((year) => (
                  <div key={year}>
                    <h3 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-400" />
                      {year}
                    </h3>
                    <div className="space-y-2">
                      {pastEventsByYear[year].map((reg) => {
                        if (!reg.event) return null;
                        return (
                          <div
                            key={reg.id}
                            className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors"
                          >
                            {/* Event Image */}
                            <div className="h-14 w-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {reg.event.cover_image_url || reg.event.flier_url ? (
                                <img
                                  src={reg.event.cover_image_url || reg.event.flier_url || ""}
                                  alt={reg.event.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Ticket className="h-6 w-6 text-white/30" />
                              )}
                            </div>

                            {/* Event Details */}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/e/${reg.event.slug}`}
                                className="block group"
                              >
                                <h3 className="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                                  {reg.event.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                                  <span>{formatEventDate(reg.event.start_time)}</span>
                                  {reg.event.venue && (
                                    <>
                                      <span>•</span>
                                      <span>{reg.event.venue.name}</span>
                                    </>
                                  )}
                                </div>
                              </Link>
                            </div>

                            {/* Check-in Status */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {reg.checkins && reg.checkins.length > 0 ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Attended</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/50 text-sm">
                                  <XCircle className="h-4 w-4" />
                                  <span>Missed</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
                <Ticket className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No event history</h3>
                <p className="text-white/50">
                  Your past events will appear here
                </p>
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {upcomingEvents.length === 0 && pastEvents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
            <Ticket className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No events yet</h3>
            <p className="text-white/50 mb-6">
              Discover events and get your tickets!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-medium hover:scale-105 transition-transform"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
