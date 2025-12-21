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

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // Load roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id);

      if (userRoles) {
        const roleList = userRoles.map((r: any) => r.role);
        setRoles(roleList);
        
        // Load promoter stats if user is a promoter
        if (roleList.includes("promoter")) {
          try {
            const statsResponse = await fetch("/api/promoter/dashboard-stats");
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              setPromoterStats({
                totalCheckIns: statsData.stats?.totalCheckIns || 0,
                conversionRate: statsData.stats?.conversionRate || 0,
                totalEarnings: statsData.stats?.totalEarnings || 0,
                referrals: statsData.stats?.referrals || 0,
                eventsPromoted: 0, // Not in stats, but we can calculate from event_promoters if needed
              });
            }
          } catch (error) {
            console.error("Error loading promoter stats:", error);
          }
        }
      }

      // Load profile
      const { data: attendee } = await supabase
        .from("attendees")
        .select("id, name, email, phone, user_id")
        .eq("user_id", currentUser.id)
        .single();

      // Load XP from unified XP system
      let totalXp = 0;
      try {
        if (attendee?.user_id || currentUser) {
          const xpResponse = await fetch("/api/xp/me");
          if (xpResponse.ok) {
            const xpData = await xpResponse.json();
            totalXp = xpData.total_xp || 0;
          }
        }
      } catch (error) {
        console.error("[Me] Error loading XP:", error);
      }

      setProfile({
        name: attendee?.name || currentUser.user_metadata?.name || null,
        email: attendee?.email || currentUser.email || null,
        phone: attendee?.phone || null,
        xp_points: totalXp,
        attendee_id: attendee?.id || null,
      });

      // Load registrations with events
      console.log("[Me] Loading registrations for attendee:", attendee?.id);
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
            venue:venues(name, city)
          ),
          checkins(checked_in_at)
        `)
        .eq("attendee_id", attendee?.id || "")
        .order("registered_at", { ascending: false });
      
      console.log("[Me] Registrations result:", registrations, "Error:", regError);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <LoadingSpinner text="Loading your dashboard..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {profile?.name ? `Hey, ${profile.name.split(" ")[0]}!` : "Welcome back!"}
          </h1>
          <p className="mt-2 text-white/60">
            Here's what's happening with your events
          </p>

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
          <div className="mb-8 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/5 p-6">
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
                href="/app/promoter"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
              >
                View Full Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Referrals</p>
                </div>
                <p className="text-2xl font-bold text-white">{promoterStats.referrals}</p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Check-ins</p>
                </div>
                <p className="text-2xl font-bold text-white">{promoterStats.totalCheckIns}</p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Conversion</p>
                </div>
                <p className="text-2xl font-bold text-white">{promoterStats.conversionRate}%</p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <p className="text-xs text-white/60 uppercase tracking-wide">Earnings</p>
                </div>
                <p className="text-2xl font-bold text-white">${promoterStats.totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Completion Prompt */}
        {!isProfileComplete(profile) && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Complete Your Profile
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  Add your name, email, and phone number to get the most out of your event experience. Social handles are optional.
                </p>
                <Link href="/me/profile">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
                    Complete Profile
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-indigo-500/30 flex items-center justify-center">
                <Star className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{profile?.xp_points || 0}</p>
            <p className="text-sm text-white/50">XP Points</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-green-500/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{happeningNowEvents.length + todayEvents.length + upcomingEvents.length}</p>
            <p className="text-sm text-white/50">Upcoming</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-500/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {pastEvents.filter(reg => reg.checkins && reg.checkins.length > 0).length}
            </p>
            <p className="text-sm text-white/50">Attended</p>
          </div>
        </div>

        {/* Attendance Motivation Card - Conditional based on show rate */}
        {(() => {
          const attended = pastEvents.filter(reg => reg.checkins && reg.checkins.length > 0).length;
          const totalPast = pastEvents.length;
          const showRate = totalPast > 0 ? Math.round((attended / totalPast) * 100) : 0;
          const hasUpcoming = happeningNowEvents.length + todayEvents.length + upcomingEvents.length > 0;
          
          // Great show rate (>70%)
          if (showRate >= 70 && totalPast >= 2) {
            return (
              <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      🎯 Great show rate: {showRate}%
                    </p>
                    <p className="text-sm text-white/60">
                      You've attended {attended} of {totalPast} past events. Keep it up!
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          // Good show rate (50-70%)
          if (showRate >= 50 && totalPast >= 2) {
            return (
              <div className="mb-8 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      You've made it to {attended} event{attended !== 1 ? 's' : ''}!
                    </p>
                    <p className="text-sm text-white/60">
                      Keep the momentum going - your next event awaits!
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          // Low show rate or new user - only show if they have upcoming events
          if (hasUpcoming && totalPast > 0) {
            return (
              <div className="mb-8 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Your next event awaits! ✨
                    </p>
                    <p className="text-sm text-white/60">
                      Check in at events to earn XP and unlock rewards.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })()}

        {/* Happening Now - Most prominent */}
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
                  className="rounded-2xl border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/5 overflow-hidden"
                >
                  <Link
                    href={`/e/${reg.event?.slug}`}
                    className="block hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {reg.event?.cover_image_url ? (
                          <img
                            src={reg.event.cover_image_url}
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
                  className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 overflow-hidden"
                >
                  <Link
                    href={`/e/${reg.event?.slug}`}
                    className="block hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {reg.event?.cover_image_url ? (
                          <img
                            src={reg.event.cover_image_url}
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
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <Link
                    href={`/e/${reg.event?.slug}`}
                    className="block hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Event Image or Placeholder */}
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {reg.event?.cover_image_url ? (
                          <img
                            src={reg.event.cover_image_url}
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
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
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
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 transition-all group"
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
  );
}
