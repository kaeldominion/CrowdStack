"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LoadingSpinner } from "@crowdstack/ui";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Star,
  TrendingUp,
  QrCode,
  ChevronRight,
  Sparkles,
  UserPlus,
  AlertCircle,
  Users,
  DollarSign,
  Target,
  Share2,
  Eye,
  EyeOff,
} from "lucide-react";

interface Registration {
  id: string;
  event_id: string;
  registered_at: string;
  qr_pass_token?: string;
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

interface UserProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  xp_points: number;
  attendee_id: string | null;
}

type EventStatus = "happening_now" | "today" | "upcoming" | "past";

// QR Pass button component
function QRPassButton({ registrationId, eventSlug }: { registrationId: string; eventSlug: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    
    try {
      const response = await fetch(`/api/registrations/${registrationId}/qr-token`);
      if (response.ok) {
        const data = await response.json();
        router.push(`/e/${eventSlug}/pass?token=${data.qr_token}`);
      } else {
        console.error("Failed to get QR token");
      }
    } catch (error) {
      console.error("Error fetching QR token:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
    >
      <QrCode className="h-5 w-5" />
      {loading ? "Loading..." : "View QR Pass"}
    </button>
  );
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [happeningNowEvents, setHappeningNowEvents] = useState<Registration[]>([]);
  const [todayEvents, setTodayEvents] = useState<Registration[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Registration[]>([]);
  const [pastEvents, setPastEvents] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [promoterStats, setPromoterStats] = useState<{
    totalCheckIns: number;
    conversionRate: number;
    totalEarnings: number;
    referrals: number;
    eventsPromoted: number;
  } | null>(null);
  const [referralStats, setReferralStats] = useState<{
    totalClicks: number;
    totalRegistrations: number;
    convertedClicks: number;
    conversionRate: number;
    eventBreakdown: Array<{
      eventId: string;
      eventName: string;
      eventSlug: string;
      clicks: number;
      registrations: number;
    }>;
  } | null>(null);
  const [hideEarnings, setHideEarnings] = useState(true); // Hidden by default for privacy

  useEffect(() => {
    loadUserData();
  }, []);

  const loadReferralStats = async () => {
    try {
      const response = await fetch("/api/referral/stats");
      if (response.ok) {
        const data = await response.json();
        setReferralStats(data);
      }
    } catch (error) {
      console.error("Error loading referral stats:", error);
    }
  };

  const loadUserData = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // Parallel loading - all queries at once
      const [rolesResult, attendeeResult, xpResult, referralResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
        supabase.from("attendees").select("id, name, email, phone, user_id").eq("user_id", currentUser.id).maybeSingle(),
        fetch("/api/xp/me").catch(() => null),
        fetch("/api/referral/stats").catch(() => null),
      ]);

      const userRoles = rolesResult.data || [];
      const attendee = attendeeResult.data;
      const roleList = userRoles.map((r: any) => r.role);
      setRoles(roleList);

      // Process XP
      let totalXp = 0;
      if (xpResult && xpResult.ok) {
        try {
          const xpData = await xpResult.json();
          totalXp = xpData.total_xp || 0;
        } catch {}
      }

      // Process referral stats
      if (referralResult && referralResult.ok) {
        try {
          const referralData = await referralResult.json();
          setReferralStats(referralData);
        } catch {}
      }

      setProfile({
        name: attendee?.name || currentUser.user_metadata?.name || null,
        email: attendee?.email || currentUser.email || null,
        phone: attendee?.phone || null,
        xp_points: totalXp,
        attendee_id: attendee?.id || null,
      });

      // Load promoter stats if user is a promoter (can be done in parallel with registrations)
      const promoterStatsPromise = roleList.includes("promoter")
        ? fetch("/api/promoter/dashboard-stats")
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.stats) {
                setPromoterStats({
                  totalCheckIns: data.stats.totalCheckIns || 0,
                  conversionRate: data.stats.conversionRate || 0,
                  totalEarnings: data.stats.totalEarnings || 0,
                  referrals: data.stats.referrals || 0,
                  eventsPromoted: 0,
                });
              }
            })
            .catch((error) => console.error("Error loading promoter stats:", error))
        : Promise.resolve();

      // Load registrations with events
      let registrations: any[] | null = null;
      
      if (attendee?.id) {
        const result = await supabase
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
        
        registrations = result.data;
      }
      
      // Wait for promoter stats to complete (non-blocking)
      await promoterStatsPromise;
      
      console.log("[Me] Registrations result:", {
        count: registrations?.length || 0,
        registrations: registrations?.slice(0, 3), // Log first 3
        error: regError?.message,
        attendeeId: attendee?.id,
      });

      if (registrations) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        
        const happeningNow: Registration[] = [];
        const today: Registration[] = [];
        const upcoming: Registration[] = [];
        const past: Registration[] = [];

        registrations.forEach((reg: any) => {
          if (!reg.event) return;
          
          // Handle array response from Supabase
          const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
          const venue = event?.venue ? (Array.isArray(event.venue) ? event.venue[0] : event.venue) : null;
          
          if (!event) return;
          
          const startTime = new Date(event.start_time);
          const endTime = event.end_time ? new Date(event.end_time) : null;
          
          const normalizedReg = {
            ...reg,
            event: { ...event, venue },
          };

          // Determine event status
          const hasStarted = startTime <= now;
          const isToday = startTime >= todayStart && startTime < todayEnd;
          
          // For events without end_time, consider them "ended" if they started more than 24 hours ago
          // This prevents past events from being stuck in "happening now" forever
          const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const hasEnded = endTime 
            ? endTime < now 
            : (hasStarted && startTime < hoursAgo24); // No end_time but started > 24h ago = past
          
          // Event is "happening now" if it started within the last 24 hours and hasn't ended
          const isHappeningNow = hasStarted && !hasEnded && startTime >= hoursAgo24;
          
          if (hasEnded) {
            // Event has ended (explicitly or implicitly for old events without end_time)
            past.push(normalizedReg);
          } else if (isHappeningNow) {
            // Event has started within last 24h and not ended - happening now!
            happeningNow.push(normalizedReg);
          } else if (isToday) {
            // Event starts today but hasn't started yet
            today.push(normalizedReg);
          } else if (startTime > now) {
            // Event is in the future
            upcoming.push(normalizedReg);
          } else {
            // Fallback - treat as past (should not typically reach here)
            past.push(normalizedReg);
          }
        });

        // Sort each category
        happeningNow.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
        today.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
        upcoming.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
        past.sort((a, b) => new Date(b.event?.start_time || 0).getTime() - new Date(a.event?.start_time || 0).getTime());

        setHappeningNowEvents(happeningNow);
        setTodayEvents(today);
        setUpcomingEvents(upcoming);
        setPastEvents(past);
        
        console.log("[Me] Event categorization:", {
          happeningNow: happeningNow.length,
          today: today.length,
          upcoming: upcoming.length,
          past: past.length,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
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

  const getTimeUntil = (dateStr: string) => {
    const now = new Date();
    const eventDate = new Date(dateStr);
    const diff = eventDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "Soon!";
  };

  // Check if profile is complete (name, phone, email required; instagram/tiktok optional)
  const isProfileComplete = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    return !!(profile.name && profile.phone && profile.email);
  };

  // Get the next event's flyer for background
  const getNextEventFlyer = (): string | null => {
    // Priority: happening now > today > upcoming
    const nextEvent = 
      happeningNowEvents[0]?.event ||
      todayEvents[0]?.event ||
      upcomingEvents[0]?.event;
    
    if (!nextEvent) return null;
    // Prefer flier_url, fall back to cover_image_url
    return nextEvent.flier_url || nextEvent.cover_image_url || null;
  };

  const backgroundFlyer = getNextEventFlyer();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <LoadingSpinner text="Loading your dashboard..." size="lg" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0B0D10]">
      {/* Blurred Flyer Background - temporarily disabled for performance */}
      {/* TODO: Re-enable after testing 
      {backgroundFlyer && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
            style={{
              backgroundImage: `url(${backgroundFlyer})`,
              filter: "blur(40px) saturate(1.2)",
              opacity: 0.25,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D10]/50 via-[#0B0D10]/70 to-[#0B0D10]/90" />
        </div>
      )}
      */}

      <div className="relative z-10 px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
        {/* Welcome Header with Inline Stats */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left: Title and subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {profile?.name ? `Hey, ${profile.name.split(" ")[0]}!` : "Welcome back!"}
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Here's what's happening with your events
              </p>
            </div>

            {/* Right: Compact Stats Row */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20">
                <Star className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">{profile?.xp_points || 0}</span>
                <span className="text-xs text-white/50 hidden sm:inline">XP</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-500/10 backdrop-blur-sm border border-green-500/20">
                <Calendar className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-white">{happeningNowEvents.length + todayEvents.length + upcomingEvents.length}</span>
                <span className="text-xs text-white/50 hidden sm:inline">Upcoming</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/10 backdrop-blur-sm border border-amber-500/20">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">{pastEvents.filter(reg => reg.checkins && reg.checkins.length > 0).length}</span>
                <span className="text-xs text-white/50 hidden sm:inline">Attended</span>
              </div>
            </div>
          </div>

          {/* Role-based dashboard links */}
          {(roles.includes("superadmin") || roles.includes("venue_admin") || roles.includes("event_organizer") || roles.includes("promoter")) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {(roles.includes("venue_admin") || roles.includes("event_organizer")) && (
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-full text-sm font-medium hover:bg-indigo-500/30 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              )}
              {roles.includes("superadmin") && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Promoter Badge and Stats */}
        {roles.includes("promoter") && promoterStats && (
          <div className="mb-8 rounded-2xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
                    Promoter
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  You're promoting events! Here's your performance overview.
                </p>
              </div>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
              >
                View Full Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Referrals</p>
                </div>
                <p className="text-2xl font-bold text-white">{promoterStats.referrals}</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Check-ins</p>
                </div>
                <p className="text-2xl font-bold text-white">{promoterStats.totalCheckIns}</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Conversion</p>
                </div>
                <p className="text-2xl font-bold text-white">{promoterStats.conversionRate}%</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-400" />
                    <p className="text-xs text-white/60 uppercase tracking-wide">Earnings</p>
                  </div>
                  <button
                    onClick={() => setHideEarnings(!hideEarnings)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title={hideEarnings ? "Show earnings" : "Hide earnings"}
                  >
                    {hideEarnings ? (
                      <EyeOff className="h-4 w-4 text-white/40" />
                    ) : (
                      <Eye className="h-4 w-4 text-white/40" />
                    )}
                  </button>
                </div>
                <p className="text-2xl font-bold text-white">
                  {hideEarnings ? "••••••" : `$${promoterStats.totalEarnings.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Happening Now - Most prominent (events first!) */}
        {happeningNowEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-xl font-semibold text-white">Happening Now</h2>
            </div>

            <div className="space-y-3">
              {happeningNowEvents.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-2xl border-2 border-green-500/50 bg-green-500/10 backdrop-blur-sm overflow-hidden"
                >
                  <Link
                    href={`/e/${reg.event?.slug}`}
                    className="block hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(reg.event?.flier_url || reg.event?.cover_image_url) ? (
                          <img
                            src={reg.event.flier_url || reg.event.cover_image_url || ""}
                            alt={reg.event.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Ticket className="h-8 w-8 text-white/40" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors truncate">
                          {reg.event?.name}
                        </h3>
                        {reg.event?.venue && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-white/60">
                            <MapPin className="h-3.5 w-3.5" />
                            {reg.event.venue.name}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <span className="px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium animate-pulse">
                          LIVE
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <div className="px-4 pb-4">
                    <QRPassButton registrationId={reg.id} eventSlug={reg.event?.slug || ""} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <h2 className="text-xl font-semibold text-white">Today</h2>
            </div>

            <div className="space-y-3">
              {todayEvents.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm overflow-hidden"
                >
                  <Link
                    href={`/e/${reg.event?.slug}`}
                    className="block hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(reg.event?.flier_url || reg.event?.cover_image_url) ? (
                          <img
                            src={reg.event.flier_url || reg.event.cover_image_url || ""}
                            alt={reg.event.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Ticket className="h-8 w-8 text-white/40" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                          {reg.event?.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Starts at {formatEventTime(reg.event?.start_time || "")}
                          </span>
                        </div>
                        {reg.event?.venue && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-white/40">
                            <MapPin className="h-3.5 w-3.5" />
                            {reg.event.venue.name}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
                          TODAY
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <div className="px-4 pb-4">
                    <QRPassButton registrationId={reg.id} eventSlug={reg.event?.slug || ""} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
            {upcomingEvents.length > 0 && (
              <Link
                href="/me/upcoming"
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 3).map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
                >
                  <Link
                    href={`/e/${reg.event?.slug}`}
                    className="block hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Event Image or Placeholder */}
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(reg.event?.flier_url || reg.event?.cover_image_url) ? (
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
                          {reg.event?.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatEventDate(reg.event?.start_time || "")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatEventTime(reg.event?.start_time || "")}
                          </span>
                        </div>
                        {reg.event?.venue && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-white/40">
                            <MapPin className="h-3.5 w-3.5" />
                            {reg.event.venue.name}
                            {reg.event.venue.city && `, ${reg.event.venue.city}`}
                          </div>
                        )}
                      </div>

                      {/* Countdown */}
                      <div className="text-right flex-shrink-0">
                        <div className="px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-medium">
                          {getTimeUntil(reg.event?.start_time || "")}
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* QR Pass Button */}
                  <div className="px-4 pb-4">
                    <QRPassButton registrationId={reg.id} eventSlug={reg.event?.slug || ""} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 backdrop-blur-sm p-8 text-center">
              <Ticket className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No upcoming events</h3>
              <p className="text-white/50 mb-4">
                Discover events and get your tickets!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-full text-sm font-medium hover:bg-indigo-600 transition-colors"
              >
                Browse Events
              </Link>
            </div>
          )}
        </div>

        {/* Profile Completion Prompt */}
        {!isProfileComplete(profile) && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1">
                  Complete Your Profile
                </h3>
                <p className="text-sm text-white/70 mb-3">
                  Add your details to get the most out of your event experience.
                </p>
                <Link href="/me/profile">
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Complete Profile
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Referral Stats Section */}
        {referralStats && (referralStats.totalClicks > 0 || referralStats.totalRegistrations > 0) && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-indigo-400" />
                Your Referrals
              </h2>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-white">{referralStats.totalClicks}</p>
                <p className="text-xs text-white/50">Link Clicks</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-white">{referralStats.totalRegistrations}</p>
                <p className="text-xs text-white/50">Registrations</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-white">{referralStats.conversionRate}%</p>
                <p className="text-xs text-white/50">Click → Register</p>
              </div>
            </div>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent History</h2>
              <Link
                href="/me/history"
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-2">
              {pastEvents.slice(0, 3).map((reg) => (
                <Link
                  key={reg.id}
                  href={`/e/${reg.event?.slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Ticket className="h-6 w-6 text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white/80 group-hover:text-white truncate transition-colors">
                      {reg.event?.name}
                    </h3>
                    <p className="text-sm text-white/40">
                      {formatEventDate(reg.event?.start_time || "")}
                    </p>
                  </div>
                  {reg.checkins && reg.checkins.length > 0 ? (
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      Attended
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-white/10 text-white/50 text-xs font-medium">
                      Registered
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
