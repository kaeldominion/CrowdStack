"use client";

import { useState, useEffect } from "react";
import type { UserRole } from "@crowdstack/shared";
import { BentoCard } from "@/components/BentoCard";
import { Button, Badge } from "@crowdstack/ui";
import { Calendar, Users, Ticket, TrendingUp, BarChart3, Activity, Plus, Zap, DollarSign, Trophy, Target, QrCode, Copy, Check, Building2, Repeat, Radio, MapPin, UserCheck, Globe, Eye, ExternalLink, History, Clock, ArrowUpRight, ChevronRight, Briefcase } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { RegistrationChart } from "@/components/charts/RegistrationChart";
import { EarningsChart } from "@/components/charts/EarningsChart";
import { createBrowserClient } from "@crowdstack/shared";
import { DJProfileSelector } from "@/components/DJProfileSelector";

interface UnifiedDashboardProps {
  userRoles: UserRole[];
}

interface LiveEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  capacity: number | null;
  venue?: { id: string; name: string } | null;
  organizer?: { id: string; name: string } | null;
  registrations: number;
  checkins: number;
}

interface PromoterEvent {
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

export function UnifiedDashboard({ userRoles }: UnifiedDashboardProps) {
  const [venueStats, setVenueStats] = useState({
    totalEvents: 0,
    thisMonth: 0,
    totalCheckIns: 0,
    repeatRate: 0,
    avgAttendance: 0,
    topEvent: "N/A",
    topEventDetails: null as {
      id: string;
      name: string;
      registrations: number;
      checkins: number;
      date: string;
    } | null,
  });
  const [attendeeStats, setAttendeeStats] = useState({
    totalAttendees: 0,
    totalCheckins: 0,
    newThisMonth: 0,
    repeatVisitors: 0,
    flaggedCount: 0,
    topAttendees: [] as Array<{ id: string; name: string; checkins: number; events: number; xp_points: number }>,
  });
  const [venue, setVenue] = useState<{
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
  } | null>(null);
  const [organizerStats, setOrganizerStats] = useState({
    totalEvents: 0,
    registrations: 0,
    checkIns: 0,
    promoters: 0,
    conversionRate: 0,
    revenue: 0,
  });
  const [promoterStats, setPromoterStats] = useState({
    totalCheckIns: 0,
    conversionRate: 0,
    totalEarnings: 0,
    earnings: {
      confirmed: 0,
      pending: 0,
      estimated: 0,
      total: 0,
    },
    earningsByCurrency: {} as Record<string, { confirmed: number; pending: number; estimated: number; total: number }>,
    rank: 0,
    referrals: 0,
    avgPerEvent: 0,
    eventsCount: 0,
  });
  const [organizerChartData, setOrganizerChartData] = useState<Array<{ date: string; registrations: number; checkins: number }>>([]);
  const [promoterChartData, setPromoterChartData] = useState<Array<{ date: string; earnings: number }>>([]);
  const [promoterEvents, setPromoterEvents] = useState<{
    liveEvents: PromoterEvent[];
    upcomingEvents: PromoterEvent[];
    pastEvents: PromoterEvent[];
  }>({ liveEvents: [], upcomingEvents: [], pastEvents: [] });
  const [organizerEvents, setOrganizerEvents] = useState<{
    liveEvents: Array<{ id: string; name: string; slug: string; start_time: string; end_time: string | null; venue_name: string | null; registrations: number; checkins: number; capacity: number | null; flier_url: string | null; status: string; venue_approval_status: string }>;
    upcomingEvents: Array<{ id: string; name: string; slug: string; start_time: string; end_time: string | null; venue_name: string | null; registrations: number; checkins: number; capacity: number | null; flier_url: string | null; status: string; venue_approval_status: string }>;
    pastEvents: Array<{ id: string; name: string; slug: string; start_time: string; end_time: string | null; venue_name: string | null; registrations: number; checkins: number; capacity: number | null; flier_url: string | null; status: string; venue_approval_status: string }>;
  }>({ liveEvents: [], upcomingEvents: [], pastEvents: [] });
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [pendingPromoterRequests, setPendingPromoterRequests] = useState(0);
  const [djStats, setDJStats] = useState({
    mixesCount: 0,
    totalPlays: 0,
    followerCount: 0,
    upcomingEventsCount: 0,
    gigInvitationsCount: 0,
    earnings: { confirmed: 0, pending: 0, estimated: 0, total: 0 },
    totalEarnings: 0,
    referrals: 0,
    totalCheckIns: 0,
    conversionRate: 0,
    eventsPromotedCount: 0,
  });
  const [djHandle, setDJHandle] = useState<string | null>(null);

  const isVenue = userRoles.includes("venue_admin");
  const isOrganizer = userRoles.includes("event_organizer");
  const isPromoter = userRoles.includes("promoter");
  const isDJ = userRoles.includes("dj");
  const isSuperadmin = userRoles.includes("superadmin");

    useEffect(() => {
    loadAllStats();
    loadLiveEvents();

    // Refresh live events every 30 seconds
    const interval = setInterval(loadLiveEvents, 30000);
    return () => clearInterval(interval);
  }, [userRoles, isPromoter, isVenue, isOrganizer, isDJ]);

  const loadLiveEvents = async () => {
    try {
      // Fetch live events based on user's role
      let endpoint = "";
      if (isVenue) {
        endpoint = "/api/venue/events/live";
      } else if (isOrganizer) {
        endpoint = "/api/organizer/events/live";
      } else if (isPromoter) {
        endpoint = "/api/promoter/events/live";
      }

      if (endpoint) {
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setLiveEvents(data.events || []);
        }
      }
    } catch (error) {
      console.error("Error loading live events:", error);
    }
  };

  const loadAllStats = async () => {
    setLoading(true);
    const promises = [];

    if (isVenue) {
      promises.push(
        fetch("/api/venue/dashboard-stats")
          .then((r) => r.json())
          .then((data) => {
            setVenueStats(data.stats || venueStats);
            if (data.venue) {
              setVenue(data.venue);
            }
          })
          .catch((e) => console.error("Failed to load venue stats:", e))
      );
      promises.push(
        fetch("/api/venue/attendees/stats")
          .then((r) => r.json())
          .then((data) => {
            setAttendeeStats(data);
          })
          .catch((e) => console.error("Failed to load attendee stats:", e))
      );
    }

    if (isOrganizer) {
      promises.push(
        fetch("/api/organizer/dashboard-stats")
          .then((r) => r.json())
          .then((data) => {
            setOrganizerStats(data.stats || organizerStats);
            setOrganizerChartData(data.chartData || []);
          })
          .catch((e) => console.error("Failed to load organizer stats:", e)),
        fetch("/api/organizer/dashboard-events")
          .then((r) => r.json())
          .then((data) => {
            setOrganizerEvents({
              liveEvents: data.liveEvents || [],
              upcomingEvents: data.upcomingEvents || [],
              pastEvents: data.pastEvents || [],
            });
          })
          .catch((e) => console.error("Failed to load organizer events:", e))
      );
      // Fetch pending promoter requests count
      promises.push(
        fetch("/api/organizer/promoter-requests")
          .then((r) => r.json())
          .then((data) => {
            setPendingPromoterRequests(data.counts?.pending || 0);
          })
          .catch((e) => console.error("Failed to load promoter requests:", e))
      );
    }

    if (isPromoter) {
      promises.push(
        fetch("/api/promoter/dashboard-stats")
          .then((r) => r.json())
          .then((data) => {
            setPromoterStats(data.stats || promoterStats);
            setPromoterChartData(data.earningsChartData || []);
          })
          .catch((e) => console.error("Failed to load promoter stats:", e))
      );
      promises.push(
        fetch("/api/promoter/dashboard-events")
          .then((r) => r.json())
          .then((data) => {
            setPromoterEvents({
              liveEvents: data.liveEvents || [],
              upcomingEvents: data.upcomingEvents || [],
              pastEvents: data.pastEvents || [],
            });
          })
          .catch((e) => console.error("Failed to load promoter events:", e))
      );
    }

    if (isDJ) {
      promises.push(
        fetch("/api/dj/dashboard-stats")
          .then((r) => r.json())
          .then((data) => {
            setDJStats(data.stats || djStats);
          })
          .catch((e) => console.error("Failed to load DJ stats:", e))
      );
      promises.push(
        fetch("/api/dj/profile")
          .then((r) => r.json())
          .then((data) => {
            if (data.dj?.handle) {
              setDJHandle(data.dj.handle);
            }
          })
          .catch((e) => console.error("Failed to load DJ profile:", e))
      );
    }

    await Promise.all(promises);
    setLoading(false);
  };

  const copyEventLink = (eventId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedEventId(eventId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-secondary">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            {userRoles.length > 1 
              ? "Overview across all your roles" 
              : "Overview of your performance"}
          </p>
        </div>
        <div className="flex gap-2">
          {isVenue && (
            <Link href="/app/venue/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
          {isOrganizer && (
            <Link href="/app/organizer/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Live Events Section */}
      {liveEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <h2 className="text-xl font-semibold text-white">Live Now</h2>
            </div>
            <span className="text-sm text-white/60">
              {liveEvents.length} event{liveEvents.length !== 1 ? "s" : ""} happening now
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveEvents.map((event) => (
              <Link 
                key={event.id} 
                href={isVenue ? `/app/venue/events/${event.id}` : isOrganizer ? `/app/organizer/events/${event.id}` : `/app/promoter/events/${event.id}`}
              >
                <BentoCard className="border-l-4 border-l-red-500 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {event.name}
                      </h3>
                      {event.venue && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-white/40 flex-shrink-0" />
                          <span className="text-xs text-white/40 truncate">
                            {event.venue.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <Radio className="h-4 w-4 text-red-500 animate-pulse flex-shrink-0" />
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-white/40" />
                      <span className="text-white/60">
                        {event.registrations} registered
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-green-400" />
                      <span className="text-green-400 font-medium">
                        {event.checkins} in
                      </span>
                    </div>
                  </div>

                  {event.capacity && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                          style={{
                            width: `${Math.min((event.checkins / event.capacity) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">
                        {Math.round((event.checkins / event.capacity) * 100)}% capacity
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    {(isVenue || isOrganizer) && (
                      <>
                        <Link
                          href={isVenue ? `/app/venue/live/${event.id}` : `/app/organizer/live/${event.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Radio className="h-3 w-3" />
                          Live Control
                        </Link>
                        <Link
                          href={`/door/${event.id}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <QrCode className="h-3 w-3" />
                          Scanner
                        </Link>
                      </>
                    )}
                    {isPromoter && (
                      <Link
                        href={`/app/promoter/live/${event.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Radio className="h-3 w-3" />
                        Live View
                      </Link>
                    )}
                  </div>
                </BentoCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Venue Admin Section */}
      {isVenue && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Venue Performance
          </h2>

          {/* Public Profile Card */}
          {venue && (
            <BentoCard span={4}>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Venue Image/Logo Preview */}
                <div className="flex-shrink-0">
                  {venue.cover_image_url ? (
                    <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden border border-white/10">
                      <Image
                        src={venue.cover_image_url}
                        alt={venue.name || "Venue"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : venue.logo_url ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                      <Image
                        src={venue.logo_url}
                        alt={venue.name || "Venue"}
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-48 h-32 rounded-lg border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                </div>

                {/* Venue Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-white/60" />
                      <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
                        Public Profile
                      </p>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{venue.name || "Venue"}</h3>
                    {venue.slug ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-md border border-white/10">
                          <code className="text-sm text-white/80 font-mono flex-1 truncate">
                            {(() => {
                              if (typeof window !== "undefined") {
                                const origin = window.location.origin;
                                const webUrl = origin.replace(/app(-beta)?\./, "");
                                return `${webUrl}/v/${venue.slug}`;
                              }
                              return `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/v/${venue.slug}`;
                            })()}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const origin = window.location.origin;
                              const webUrl = origin.replace(/app(-beta)?\./, "");
                              const url = `${webUrl}/v/${venue.slug}`;
                              navigator.clipboard.writeText(url);
                              alert("Link copied to clipboard!");
                            }}
                            className="text-xs"
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <a
                            href={(() => {
                              if (typeof window !== "undefined") {
                                const origin = window.location.origin;
                                const webUrl = origin.replace(/app(-beta)?\./, "");
                                return `${webUrl}/v/${venue.slug}`;
                              }
                              return `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/v/${venue.slug}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="primary" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Live Profile
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                          </a>
                          <Link href="/app/venue/settings">
                            <Button variant="secondary" size="sm">
                              Edit Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-white/60">
                          Set up your public profile to share your venue with event-goers
                        </p>
                        <Link href="/app/venue/settings">
                          <Button variant="primary" size="sm">
                            Set Up Public Profile
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </BentoCard>
          )}

          <div className="grid grid-cols-4 gap-2">
            <BentoCard className="[&>div]:!px-3 [&>div]:!py-2.5 relative">
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5 truncate">Total Events</p>
                  <p className="text-lg font-bold tracking-tight text-white">{venueStats.totalEvents}</p>
                </div>
              </div>
              <Calendar className="h-3.5 w-3.5 text-white/40 absolute bottom-1 right-1 flex-shrink-0" />
            </BentoCard>
            <BentoCard className="[&>div]:!px-3 [&>div]:!py-2.5 relative">
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5 truncate">This Month</p>
                  <p className="text-lg font-bold tracking-tight text-white">{venueStats.thisMonth}</p>
                </div>
              </div>
              <TrendingUp className="h-3.5 w-3.5 text-white/40 absolute bottom-1 right-1 flex-shrink-0" />
            </BentoCard>
            <BentoCard className="[&>div]:!px-3 [&>div]:!py-2.5 relative">
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5 truncate">Check-ins</p>
                  <p className="text-lg font-bold tracking-tight text-white">{venueStats.totalCheckIns}</p>
                </div>
              </div>
              <Ticket className="h-3.5 w-3.5 text-white/40 absolute bottom-1 right-1 flex-shrink-0" />
            </BentoCard>
            <BentoCard className="[&>div]:!px-3 [&>div]:!py-2.5 relative">
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5 truncate">Repeat Rate</p>
                  <p className="text-lg font-bold tracking-tight text-white">{venueStats.repeatRate}%</p>
                </div>
              </div>
              <Repeat className="h-3.5 w-3.5 text-white/40 absolute bottom-1 right-1 flex-shrink-0" />
            </BentoCard>
          </div>

          {/* Additional Venue Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BentoCard span={2}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Average Attendance</p>
                  <Users className="h-4 w-4 text-white/40" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tighter text-white">{venueStats.avgAttendance}</p>
                  <span className="text-sm text-white/40">per event</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: "75%" }}
                  />
                </div>
              </div>
            </BentoCard>

            {venueStats.topEventDetails ? (
              <Link href={`/app/venue/events/${venueStats.topEventDetails.id}`} className="block">
                <BentoCard span={2} className="hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Top Performing Event</p>
                      <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-xl font-bold tracking-tighter text-white group-hover:text-indigo-300 transition-colors truncate">
                      {venueStats.topEventDetails.name}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5 text-white/40" />
                        <span className="text-white/70">{venueStats.topEventDetails.registrations}</span>
                        <span className="text-white/40 text-xs">reg</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-green-400 font-medium">{venueStats.topEventDetails.checkins}</span>
                        <span className="text-white/40 text-xs">in</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/40">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          {new Date(venueStats.topEventDetails.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </BentoCard>
              </Link>
            ) : (
              <BentoCard span={2}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Top Performing Event</p>
                    <BarChart3 className="h-4 w-4 text-white/40" />
                  </div>
                  <p className="text-2xl font-bold tracking-tighter text-white/40">No events yet</p>
                </div>
              </BentoCard>
            )}
          </div>

          {/* Attendees Card */}
          <Link href="/app/venue/attendees" className="block">
            <BentoCard span={4} className="hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" />
                    Attendee Database
                  </h3>
                  <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors flex items-center gap-1">
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
                
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-2xl font-bold text-white">{attendeeStats.totalAttendees}</p>
                    <p className="text-xs text-white/50">Total Guests</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-2xl font-bold text-green-400">+{attendeeStats.newThisMonth}</p>
                    <p className="text-xs text-white/50">New This Month</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-2xl font-bold text-indigo-400">{attendeeStats.repeatVisitors}</p>
                    <p className="text-xs text-white/50">Repeat Visitors</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-2xl font-bold text-white">{attendeeStats.totalCheckins}</p>
                    <p className="text-xs text-white/50">Total Check-ins</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-2xl font-bold text-amber-400">{attendeeStats.flaggedCount}</p>
                    <p className="text-xs text-white/50">Flagged</p>
                  </div>
                </div>

                {/* Top Attendees */}
                {attendeeStats.topAttendees.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-3">Top Attendees</p>
                    <div className="flex flex-wrap gap-2">
                      {attendeeStats.topAttendees.map((attendee, index) => (
                        <div
                          key={attendee.id}
                          className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10"
                        >
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
                            {index + 1}
                          </div>
                          <span className="text-sm text-white font-medium">{attendee.name}</span>
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            <UserCheck className="h-3 w-3" />
                            {attendee.checkins}
                          </div>
                          {attendee.xp_points > 0 && (
                            <div className="flex items-center gap-0.5 text-xs text-amber-400">
                              <Zap className="h-3 w-3" />
                              {attendee.xp_points}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </BentoCard>
          </Link>
        </section>
      )}

      {/* Event Organizer Section */}
      {isOrganizer && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Management
          </h2>

          {/* Pending Promoter Requests Alert - DISABLED: Promoter request feature is currently disabled */}
          {false && pendingPromoterRequests > 0 && (
            <Link href="/app/organizer/promoter-requests">
              <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/15 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {pendingPromoterRequests} Pending Promoter Request{pendingPromoterRequests > 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-gray-400">
                      Promoters want to promote your events
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-yellow-400" />
              </div>
            </Link>
          )}

          <div className="grid grid-cols-4 gap-2">
            <BentoCard className="[&>div]:!p-2">
              <div className="relative h-full flex flex-col">
                <div className="flex-1">
                  <p className="text-[8px] uppercase tracking-widest text-white/40 font-medium mb-0.5">EVENTS</p>
                  <p className="text-lg font-bold tracking-tighter text-white">{organizerStats.totalEvents}</p>
                </div>
                <Calendar className="h-3.5 w-3.5 text-white/40 absolute bottom-0 right-0" />
              </div>
            </BentoCard>
            <BentoCard className="[&>div]:!p-2">
              <div className="relative h-full flex flex-col">
                <div className="flex-1">
                  <p className="text-[8px] uppercase tracking-widest text-white/40 font-medium mb-0.5">RGSTRTNS</p>
                  <p className="text-lg font-bold tracking-tighter text-white">{organizerStats.registrations}</p>
                </div>
                <Ticket className="h-3.5 w-3.5 text-white/40 absolute bottom-0 right-0" />
              </div>
            </BentoCard>
            <BentoCard className="[&>div]:!p-2">
              <div className="relative h-full flex flex-col">
                <div className="flex-1">
                  <p className="text-[8px] uppercase tracking-widest text-white/40 font-medium mb-0.5">CHECK-INS</p>
                  <p className="text-lg font-bold tracking-tighter text-white">{organizerStats.checkIns}</p>
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-white/40 absolute bottom-0 right-0" />
              </div>
            </BentoCard>
            <BentoCard className="[&>div]:!p-2">
              <div className="relative h-full flex flex-col">
                <div className="flex-1">
                  <p className="text-[8px] uppercase tracking-widest text-white/40 font-medium mb-0.5">PRMTRS</p>
                  <p className="text-lg font-bold tracking-tighter text-white">{organizerStats.promoters}</p>
                </div>
                <Users className="h-3.5 w-3.5 text-white/40 absolute bottom-0 right-0" />
              </div>
            </BentoCard>
          </div>
          {organizerChartData.length > 0 && (
            <BentoCard span={4}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Registrations vs Check-ins</p>
                  <BarChart3 className="h-4 w-4 text-white/40" />
                </div>
                <RegistrationChart data={organizerChartData} height={250} />
              </div>
            </BentoCard>
          )}

          {/* Additional Organizer Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BentoCard span={2}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Conversion Rate</p>
                  <Activity className="h-4 w-4 text-white/40" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tighter text-white">{organizerStats.conversionRate}%</p>
                  <span className="text-sm text-white/40">registrations → check-ins</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(organizerStats.conversionRate, 100)}%` }}
                  />
                </div>
              </div>
            </BentoCard>

            <BentoCard span={2}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Total Revenue</p>
                  <BarChart3 className="h-4 w-4 text-white/40" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tighter text-white font-mono">
                    ${organizerStats.revenue.toLocaleString()}
                  </p>
                  <span className="text-sm text-white/40">this month</span>
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Upcoming Events - List View */}
          {organizerEvents.upcomingEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="section-header flex items-center gap-2 !mb-0">
                  <Clock className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  Upcoming Events
                </h3>
                <Link href="/app/organizer/events">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {organizerEvents.upcomingEvents.slice(0, 5).map((event) => (
                  <Link key={event.id} href={`/app/organizer/events/${event.id}`}>
                    <div className="relative flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-subtle hover:border-accent-primary/30 hover:bg-active/50 transition-all cursor-pointer group">
                      {event.flier_url && (
                        <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
                          <img src={event.flier_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary uppercase line-clamp-2 group-hover:text-accent-secondary transition-colors mb-1">
                          {event.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-secondary">
                          <Calendar className="h-3 w-3 text-muted flex-shrink-0" />
                          <span>{new Date(event.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span className="text-muted">•</span>
                          <span>{new Date(event.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                        {event.venue_name && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-sm text-secondary">
                            <MapPin className="h-3 w-3 text-muted flex-shrink-0" />
                            <span className="line-clamp-1">{event.venue_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {event.venue_approval_status === "pending" && (
                            <Badge variant="warning" className="!text-[9px]">Pending</Badge>
                          )}
                          {event.status === "draft" && (
                            <Badge variant="secondary" className="!text-[9px]">Draft</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center min-w-[50px]">
                          <p className="text-sm font-bold text-primary">{event.registrations}</p>
                          <p className="font-mono text-[8px] uppercase tracking-widest text-secondary">Reg</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No Events State */}
          {organizerEvents.liveEvents.length === 0 && organizerEvents.upcomingEvents.length === 0 && (
            <BentoCard className="text-center py-8">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Upcoming Events</h3>
              <p className="text-white/60 mb-4">Create your first event to start managing your business!</p>
              <Link href="/app/organizer/events/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </Link>
            </BentoCard>
          )}
        </section>
      )}

      {/* Promoter Section */}
      {isPromoter && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Events
            </h2>
            <Link href="/app/promoter/events">
              <Button variant="secondary" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Find Events
              </Button>
            </Link>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Events</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">
                    {promoterEvents.liveEvents.length + promoterEvents.upcomingEvents.length + promoterEvents.pastEvents.length}
                  </p>
                </div>
                <Calendar className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Registrations</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{promoterStats.referrals}</p>
                </div>
                <Ticket className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{promoterStats.totalCheckIns}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <Link href="/app/promoter/earnings">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Earnings</p>
                    {Object.keys(promoterStats.earningsByCurrency || {}).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(promoterStats.earningsByCurrency).map(([currency, amounts]) => (
                          <div key={currency} className="flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-tighter text-white font-mono">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(amounts.total)}
                            </span>
                            <div className="flex gap-1.5 text-[9px]">
                              {amounts.confirmed > 0 && (
                                <span className="text-green-400">✓{amounts.confirmed.toLocaleString()}</span>
                              )}
                              {amounts.pending > 0 && (
                                <span className="text-amber-400">⏳{amounts.pending.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-2xl font-bold tracking-tighter text-white/50 font-mono">$0</p>
                    )}
                  </div>
                  <DollarSign className="h-5 w-5 text-white/40 flex-shrink-0" />
                </div>
              </BentoCard>
            </Link>
          </div>

          {/* Live Events */}
          {promoterEvents.liveEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                <h3 className="text-lg font-semibold text-white">Live Now</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {promoterEvents.liveEvents.map((event) => (
                  <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                    <BentoCard className="border-l-4 border-l-red-500 hover:bg-white/10 transition-colors cursor-pointer h-full">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">{event.name}</h4>
                            {event.venue_name && (
                              <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.venue_name}
                              </p>
                            )}
                          </div>
                          <Radio className="h-4 w-4 text-red-500 animate-pulse flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-white/60">{event.registrations} reg</span>
                          <span className="text-green-400 font-medium">{event.checkins} in</span>
                          <span className="text-white/60">{event.conversionRate}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10">
                          <input
                            type="text"
                            value={event.referral_link}
                            readOnly
                            className="flex-1 bg-transparent text-white/70 text-xs font-mono truncate"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyEventLink(event.id, event.referral_link)}
                              className="shrink-0 h-6 w-6 p-0"
                            >
                              {copiedEventId === event.id ? (
                                <Check className="h-3 w-3 text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </BentoCard>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events - List View matching organizer design */}
          {promoterEvents.upcomingEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  Upcoming Events
                </h3>
                <Link href="/app/promoter/events">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-2">
                {promoterEvents.upcomingEvents.slice(0, 5).map((event) => (
                  <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Flier thumbnail */}
                        <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 bg-white/5">
                          {event.flier_url ? (
                            <img src={event.flier_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate group-hover:text-primary transition-colors">{event.name}</p>
                          <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(event.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                            <span>·</span>
                            <span>{new Date(event.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
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
                          <p className="text-sm font-medium text-white">{event.registrations}</p>
                          <p className="text-xs text-white/40">referrals</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium text-green-400">{event.checkins}</p>
                          <p className="text-xs text-white/40">check-ins</p>
                        </div>
                        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyEventLink(event.id, event.referral_link)}
                            className="h-8 w-8 p-0"
                            title="Copy referral link"
                          >
                            {copiedEventId === event.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-white/60" />
                            )}
                          </Button>
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {promoterEvents.pastEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="h-4 w-4 text-white/40" />
                Past Events
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {promoterEvents.pastEvents.slice(0, 4).map((event) => (
                  <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                    <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer h-full opacity-75">
                      <div className="space-y-2">
                        <h4 className="font-medium text-white truncate text-sm">{event.name}</h4>
                        <p className="text-xs text-white/40">
                          {new Date(event.start_time).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-white/50">{event.registrations} reg</span>
                          <span className="text-green-400/70">{event.checkins} in</span>
                          <span className="text-white/50">{event.conversionRate}%</span>
                        </div>
                      </div>
                    </BentoCard>
                  </Link>
                ))}
              </div>
              {promoterEvents.pastEvents.length > 4 && (
                <Link href="/app/promoter/events" className="block">
                  <Button variant="ghost" className="w-full">
                    View all {promoterEvents.pastEvents.length} past events
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* No Events State */}
          {promoterEvents.liveEvents.length === 0 && 
           promoterEvents.upcomingEvents.length === 0 && 
           promoterEvents.pastEvents.length === 0 && (
            <BentoCard>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Events Yet</h3>
                <p className="text-white/60 mb-4">
                  You're not assigned to any events yet. Browse available events to start promoting!
                </p>
                <Link href="/app/promoter/events">
                  <Button>Browse Events</Button>
                </Link>
              </div>
            </BentoCard>
          )}

          {/* Earnings Chart */}
          {promoterChartData.length > 0 && (
            <BentoCard span={4}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Earnings Over Time</p>
                  <DollarSign className="h-4 w-4 text-white/40" />
                </div>
                <EarningsChart data={promoterChartData} height={250} />
              </div>
            </BentoCard>
          )}
        </section>
      )}

      {/* DJ Section */}
      {isDJ && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Radio className="h-5 w-5" />
              DJ Dashboard
            </h2>
            <div className="flex items-center gap-2">
              <Link href="/app/dj/profile">
                <Button variant="secondary" size="sm">
                  Edit Profile Info
                </Button>
              </Link>
            </div>
          </div>

          {/* DJ Profile Selector */}
          <DJProfileSelector />

          {/* Public Profile Card */}
          {djHandle && (
            <BentoCard span={4}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-accent-primary" />
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
                      Your Public Profile
                    </p>
          </div>
                  <p className="text-sm text-white/60">
                    Add mixes, photos, videos, and update your avatar and cover image directly on your public profile page.
                  </p>
                </div>
                <a
                  href={(() => {
                    if (typeof window !== "undefined") {
                      const origin = window.location.origin;
                      const webUrl = origin.replace(/app(-beta)?\./, "");
                      return `${webUrl}/dj/${djHandle}`;
                    }
                    return `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/dj/${djHandle}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Public Profile
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>
            </BentoCard>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Published Mixes</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{djStats.mixesCount}</p>
                </div>
                <Radio className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Plays</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{djStats.totalPlays.toLocaleString()}</p>
                </div>
                <Eye className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Followers</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{djStats.followerCount}</p>
                </div>
                <Users className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Upcoming Events</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{djStats.upcomingEventsCount}</p>
                </div>
                <Calendar className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
          </div>

          {/* Earnings & Referrals Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Link href="/app/dj/earnings">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Earnings</p>
                    <p className="text-2xl font-bold tracking-tighter text-white font-mono">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(djStats.totalEarnings || 0)}
                    </p>
                    <div className="flex gap-2 mt-1 text-[9px]">
                      {djStats.earnings?.confirmed > 0 && (
                        <span className="text-green-400">✓{djStats.earnings.confirmed.toLocaleString()}</span>
                      )}
                      {djStats.earnings?.pending > 0 && (
                        <span className="text-amber-400">⏳{djStats.earnings.pending.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <DollarSign className="h-5 w-5 text-white/40" />
                </div>
              </BentoCard>
            </Link>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Referrals</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{djStats.referrals || 0}</p>
                </div>
                <Ticket className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{djStats.totalCheckIns || 0}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <Link href="/app/dj/gigs">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Gig Invitations</p>
                    <p className="text-3xl font-bold tracking-tighter text-white">{djStats.gigInvitationsCount || 0}</p>
                  </div>
                  <Briefcase className="h-5 w-5 text-white/40" />
                </div>
              </BentoCard>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/app/dj/gigs">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Browse Gigs</p>
                    <p className="text-xs text-white/60">Find and apply to gig postings</p>
                  </div>
                </div>
              </BentoCard>
            </Link>
            <Link href="/app/dj/qr-codes">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <QrCode className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">QR Codes</p>
                    <p className="text-xs text-white/60">Generate QR codes for referrals</p>
                  </div>
                </div>
              </BentoCard>
            </Link>
            <Link href="/app/dj/profile">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Edit Profile</p>
                    <p className="text-xs text-white/60">Update your bio and social links</p>
                  </div>
                </div>
              </BentoCard>
            </Link>
            <Link href="/app/dj/events">
              <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Your Events</p>
                    <p className="text-xs text-white/60">View upcoming and past events</p>
                  </div>
                </div>
              </BentoCard>
            </Link>
          </div>
        </section>
      )}

      {/* Superadmin Section */}
      {isSuperadmin && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Admin Access
          </h2>
          <BentoCard>
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                You have superadmin access. Visit the admin dashboard for full system management.
              </p>
              <Link href="/admin">
                <Button>
                  Go to Admin Dashboard
                </Button>
              </Link>
            </div>
          </BentoCard>
        </section>
      )}
    </div>
  );
}


