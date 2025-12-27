"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LoadingSpinner, Button, Card, Badge } from "@crowdstack/ui";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Ticket,
  Heart,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { EventCardRow } from "@/components/EventCardRow";
import { VenueCard } from "@/components/venue/VenueCard";

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
  username: string | null;
  avatar_url: string | null;
  xp_points: number;
  attendee_id: string | null;
  created_at: string | null;
}



type TabId = "events" | "djs-venues" | "history";
type MobileEventsTab = "upcoming" | "past" | "djs-venues";

export default function MePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [happeningNowEvents, setHappeningNowEvents] = useState<Registration[]>([]);
  const [todayEvents, setTodayEvents] = useState<Registration[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Registration[]>([]);
  const [pastEvents, setPastEvents] = useState<Registration[]>([]);
  const [favoriteVenues, setFavoriteVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileCta, setShowProfileCta] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [mobileEventsTab, setMobileEventsTab] = useState<MobileEventsTab>("upcoming");

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

      // Load attendee profile and XP
      const [attendeeResult, xpResult] = await Promise.all([
        supabase.from("attendees").select("id, name, email, phone, user_id, avatar_url, created_at").eq("user_id", currentUser.id).maybeSingle(),
        fetch("/api/xp/me").catch(() => null),
      ]);

      const attendee = attendeeResult.data;

      let totalXp = 0;
      if (xpResult) {
        if (xpResult.ok) {
        try {
          const xpData = await xpResult.json();
            console.log("[ME] XP data received:", xpData);
          totalXp = xpData.total_xp || 0;
          } catch (e) {
            console.error("[ME] Error parsing XP response:", e);
          }
        } else {
          console.error("[ME] XP fetch failed with status:", xpResult.status);
        }
      } else {
        console.error("[ME] XP fetch returned null");
      }

      // Extract username from email
      const email = attendee?.email || currentUser.email || "";
      const username = email.split("@")[0] || null;

      setProfile({
        name: attendee?.name || currentUser.user_metadata?.name || null,
        email: attendee?.email || currentUser.email || null,
        phone: attendee?.phone || null,
        username,
        avatar_url: attendee?.avatar_url || null,
        xp_points: totalXp,
        attendee_id: attendee?.id || null,
        created_at: attendee?.created_at || currentUser.created_at || null,
      });

      // Load registrations
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
        
        if (result.data) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        
        const happeningNow: Registration[] = [];
        const today: Registration[] = [];
        const upcoming: Registration[] = [];
        const past: Registration[] = [];

          result.data.forEach((reg: any) => {
          if (!reg.event) return;
          const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
          const venue = event?.venue ? (Array.isArray(event.venue) ? event.venue[0] : event.venue) : null;
          if (!event) return;
          
          const startTime = new Date(event.start_time);
          const endTime = event.end_time ? new Date(event.end_time) : null;
            const normalizedReg = { ...reg, event: { ...event, venue } };

          const hasStarted = startTime <= now;
          const isToday = startTime >= todayStart && startTime < todayEnd;
          const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const hasEnded = endTime ? endTime < now : (hasStarted && startTime < hoursAgo24);
          const isHappeningNow = hasStarted && !hasEnded && startTime >= hoursAgo24;
          
            if (hasEnded) past.push(normalizedReg);
            else if (isHappeningNow) happeningNow.push(normalizedReg);
            else if (isToday) today.push(normalizedReg);
            else if (startTime > now) upcoming.push(normalizedReg);
            else past.push(normalizedReg);
          });

        happeningNow.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
        today.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
        upcoming.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
        past.sort((a, b) => new Date(b.event?.start_time || 0).getTime() - new Date(a.event?.start_time || 0).getTime());

        setHappeningNowEvents(happeningNow);
        setTodayEvents(today);
        setUpcomingEvents(upcoming);
        setPastEvents(past);
        }

        // Load favorite venues
        try {
          const favoritesResponse = await fetch("/api/me/favorite-venues");
          if (favoritesResponse.ok) {
            const favoritesData = await favoritesResponse.json();
            setFavoriteVenues(favoritesData.venues || []);
          }
        } catch {}
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "TODAY";
    if (diffDays === 1) return "TOMORROW";
    if (diffDays > 1 && diffDays <= 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const formatPastDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: date.getDate().toString(),
    };
  };

  const getJoinYear = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).getFullYear();
  };

  const isProfileComplete = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    return !!(profile.name && profile.phone && profile.email);
  };

  const allUpcoming = [...happeningNowEvents, ...todayEvents, ...upcomingEvents];
  const totalEvents = pastEvents.filter(r => r.checkins && r.checkins.length > 0).length;

  // Handle registration cancellation - refresh data
  const handleCancelRegistration = (registrationId: string) => {
    // Remove from all event lists
    setHappeningNowEvents(prev => prev.filter(r => r.id !== registrationId));
    setTodayEvents(prev => prev.filter(r => r.id !== registrationId));
    setUpcomingEvents(prev => prev.filter(r => r.id !== registrationId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void overscroll-none">
      {/* Mobile Layout */}
      <div className="lg:hidden relative">
        {/* Gradient Background - extends behind nav (pt-20 = 5rem, hero = 10rem = 15rem total) */}
        <div className="absolute inset-x-0 top-0 h-[15rem] bg-gradient-to-br from-accent-primary/40 via-accent-secondary/30 to-accent-primary/20" />
        
        {/* Hero Section - starts after nav clearance */}
        <div className="relative pt-20">
          <div className="relative h-40">
            {/* Avatar */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-16 z-10">
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-4 border-void overflow-hidden bg-glass">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.name || "Profile"}
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                      <span className="text-4xl font-bold text-primary">
                        {profile?.name?.[0]?.toUpperCase() || "?"}
                      </span>
        </div>
      )}
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-accent-success border-2 border-void" />
                </div>
            </div>
          </div>
            </div>

        {/* Profile Info */}
        <div className="pt-20 px-4 text-center">
          <h1 className="page-title">
            {profile?.name ? `${profile.name.split(" ")[0]} ${profile.name.split(" ")[1]?.[0] || ""}.` : "User"}
          </h1>
          <p className="mt-2 font-mono text-sm tracking-tight text-secondary">
            @{profile?.username || "user"} • Joined {getJoinYear(profile?.created_at)}
          </p>
        </div>

        {/* XP Card - simplified, no levels yet */}
        <div className="px-4 mt-6">
          <Card padding="none">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Experience Points
                </span>
                <span className="font-mono text-xl font-bold text-accent-primary">
                  {profile?.xp_points ?? 0} XP
                </span>
              </div>
            </div>
          </Card>
        </div>
            
        {/* Stats Row - 3 columns like reference */}
        <div className="px-4 mt-4 grid grid-cols-3 gap-3">
          <Card padding="none" className="text-center">
            <div className="py-4">
              <Users className="h-5 w-5 text-muted mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{totalEvents}</p>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Events</span>
            </div>
          </Card>
          <Card padding="none" className="text-center">
            <div className="py-4">
              <Calendar className="h-5 w-5 text-muted mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{allUpcoming.length}</p>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Upcoming</span>
            </div>
          </Card>
          <Card padding="none" className="text-center">
            <div className="py-4">
              <Heart className="h-5 w-5 text-muted mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{favoriteVenues.length}</p>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Venues</span>
            </div>
          </Card>
        </div>

        {/* Complete Profile CTA */}
        {!isProfileComplete(profile) && showProfileCta && (
          <div className="px-4 mt-4">
            <Card className="!border-accent-primary/40 !bg-accent-primary/10 relative">
              <button 
                onClick={() => setShowProfileCta(false)}
                className="absolute top-3 right-3 text-muted hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-5 w-5 text-accent-primary" />
                </div>
                <div className="flex-1 pr-4">
                  <h3 className="font-sans text-base font-bold text-primary">Complete your Persona</h3>
                  <p className="text-sm text-secondary mt-1">
                    Add your bio and social links to earn <span className="font-bold text-accent-primary">+50 XP</span>.
                  </p>
                  <Button variant="secondary" size="sm" href="/me/profile" className="mt-3">
                    Edit Profile
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Content Section with Tabs */}
        <div className="mt-8 px-4 pb-8">
          {/* Tab Navigation */}
          <nav className="flex gap-4 border-b border-border-subtle mb-4">
            <button 
              onClick={() => setMobileEventsTab("upcoming")}
              className={`tab-label ${mobileEventsTab === "upcoming" ? "tab-label-active" : "tab-label-inactive"}`}
            >
              Upcoming
            </button>
            <button 
              onClick={() => setMobileEventsTab("past")}
              className={`tab-label ${mobileEventsTab === "past" ? "tab-label-active" : "tab-label-inactive"}`}
            >
              Past
            </button>
            <button 
              onClick={() => setMobileEventsTab("djs-venues")}
              className={`tab-label ${mobileEventsTab === "djs-venues" ? "tab-label-active" : "tab-label-inactive"}`}
            >
              DJs & Venues
            </button>
          </nav>

          {/* Upcoming Events Tab */}
          {mobileEventsTab === "upcoming" && (
            <>
              {allUpcoming.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                  {allUpcoming.slice(0, 5).map((reg, index) => (
                    <div 
                      key={reg.id} 
                      className={`flex-shrink-0 w-[260px] snap-start ${index === allUpcoming.slice(0, 5).length - 1 ? 'mr-4' : ''}`}
                    >
                      <AttendeeEventCard
                        event={{
                          id: reg.event?.id || reg.event_id,
                          name: reg.event?.name || "Event",
                          slug: reg.event?.slug || "",
                          start_time: reg.event?.start_time || "",
                          flier_url: reg.event?.flier_url,
                          cover_image_url: reg.event?.cover_image_url,
                          venue: reg.event?.venue,
                        }}
                        registration={{ id: reg.id }}
                        isAttending
                        onCancelRegistration={handleCancelRegistration}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="!p-8 text-center !border-dashed">
                  <Ticket className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="font-sans text-lg font-bold text-primary mb-2">No upcoming events</h3>
                  <p className="text-sm text-secondary mb-4">Discover events and get on the guestlist!</p>
                  <Button href="/browse">Browse Events</Button>
                </Card>
              )}
            </>
          )}

          {/* Past Events Tab */}
          {mobileEventsTab === "past" && (
            <>
              {pastEvents.length > 0 ? (
                <div className="space-y-3">
                  {pastEvents.slice(0, 5).map((reg) => (
                    <EventCardRow
                      key={reg.id}
                      event={{
                        id: reg.event?.id || reg.event_id,
                        name: reg.event?.name || "Event",
                        slug: reg.event?.slug || "",
                        start_time: reg.event?.start_time || "",
                        end_time: reg.event?.end_time,
                        flier_url: reg.event?.flier_url,
                        cover_image_url: reg.event?.cover_image_url,
                        venue: reg.event?.venue,
                      }}
                      isPast
                      didAttend={reg.checkins && reg.checkins.length > 0}
                    />
                  ))}
                </div>
              ) : (
                <Card className="!p-8 text-center !border-dashed">
                  <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="font-sans text-lg font-bold text-primary mb-2">No past events</h3>
                  <p className="text-sm text-secondary">Your event history will appear here.</p>
                </Card>
              )}
            </>
          )}

          {/* DJs & Venues Tab */}
          {mobileEventsTab === "djs-venues" && (
            <div className="space-y-6">
              {/* Favorite Venues */}
              <section>
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                  Favorite Venues
                </h3>
                {favoriteVenues.length > 0 ? (
                  <div className="space-y-3">
                    {favoriteVenues.slice(0, 4).map((venue) => (
                      <VenueCard
                        key={venue.id}
                        venue={{
                          id: venue.id,
                          name: venue.name,
                          slug: venue.slug,
                          logo_url: venue.logo_url,
                          cover_image_url: venue.cover_image_url,
                          city: venue.city,
                          state: venue.state,
                          tags: venue.tags,
                        }}
                        layout="landscape"
                        showRating={false}
                        showTags={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="!p-6 text-center !border-dashed">
                    <Heart className="h-10 w-10 text-muted mx-auto mb-3" />
                    <h3 className="font-sans text-base font-bold text-primary mb-1">No favorite venues</h3>
                    <p className="text-sm text-secondary">Follow venues to see them here.</p>
                  </Card>
                )}
              </section>

              {/* Favorite DJs - Coming Soon */}
              <section>
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                  Favorite DJs
                </h3>
                <Card className="!p-6 text-center !border-dashed">
                  <Users className="h-10 w-10 text-muted mx-auto mb-3" />
                  <h3 className="font-sans text-base font-bold text-primary mb-1">Coming Soon</h3>
                  <p className="text-sm text-secondary">Follow your favorite DJs and get notified.</p>
                </Card>
              </section>
            </div>
          )}
        </div>
                      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen pt-20">
        <div className="max-w-7xl mx-auto px-6 xl:px-12 overflow-visible">
          <div className="flex overflow-visible">
            {/* Left Sidebar */}
            <aside className="w-72 flex-shrink-0 py-8 pr-8 border-r border-border-subtle">
          <div className="sticky top-24 space-y-5">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-40 w-40 rounded-full overflow-hidden bg-glass border border-border-subtle">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.name || "Profile"}
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                      <span className="text-5xl font-bold text-primary">
                        {profile?.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                  )}
                    </div>
              </div>
            </div>

            {/* Name & Info */}
            <div className="text-center space-y-1">
              <h1 className="page-title !text-xl lg:!text-2xl">
                {profile?.name ? `${profile.name.split(" ")[0]} ${profile.name.split(" ")[1]?.[0] || ""}.` : "User"}
              </h1>
              <p className="font-mono text-sm tracking-tight text-secondary">
                @{profile?.username || "user"} • London, UK
              </p>
            </div>
            
            {/* XP Card - simplified, no levels yet */}
            <Card padding="none">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                    XP
                  </span>
                  <span className="font-mono text-xl font-bold text-accent-primary">
                    {profile?.xp_points ?? 0} XP
                  </span>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Card padding="none" className="text-center">
                <div className="py-3 px-2">
                  <p className="text-2xl font-bold text-primary">{totalEvents}</p>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary">Attended</span>
                </div>
              </Card>
              <Card padding="none" className="text-center">
                <div className="py-3 px-2">
                  <p className="text-2xl font-bold text-primary">{allUpcoming.length}</p>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary">Upcoming</span>
                </div>
              </Card>
              <Card padding="none" className="text-center">
                <div className="py-3 px-2">
                  <p className="text-2xl font-bold text-accent-primary">
                    {pastEvents.length > 0 ? Math.round((totalEvents / pastEvents.length) * 100) : 0}%
                  </p>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary">Rate</span>
                </div>
              </Card>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-visible">
          <div className="max-w-4xl overflow-visible">
            {/* Tab Navigation - uses global .tab-label styles */}
            <nav className="flex gap-6 border-b border-border-subtle mb-6">
              <button 
                onClick={() => setActiveTab("events")}
                className={`tab-label ${activeTab === "events" ? "tab-label-active" : "tab-label-inactive"}`}
              >
                My Events
              </button>
              <button 
                onClick={() => setActiveTab("djs-venues")}
                className={`tab-label ${activeTab === "djs-venues" ? "tab-label-active" : "tab-label-inactive"}`}
              >
                DJs & Venues
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`tab-label ${activeTab === "history" ? "tab-label-active" : "tab-label-inactive"}`}
              >
                History
              </button>
            </nav>

            {/* MY EVENTS Tab */}
            {activeTab === "events" && (
              <>
                {/* Upcoming Events - Cards */}
                <section className="mb-8 overflow-visible">
                  <h2 className="section-header">Upcoming Events</h2>

                  {allUpcoming.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-visible">
                      {allUpcoming.slice(0, 6).map((reg) => (
                        <AttendeeEventCard
                          key={reg.id}
                          event={{
                            id: reg.event?.id || reg.event_id,
                            name: reg.event?.name || "Event",
                            slug: reg.event?.slug || "",
                            start_time: reg.event?.start_time || "",
                            flier_url: reg.event?.flier_url,
                            cover_image_url: reg.event?.cover_image_url,
                            venue: reg.event?.venue,
                          }}
                          registration={{ id: reg.id }}
                          variant={happeningNowEvents.includes(reg) ? "live" : "attending"}
                          isAttending
                          capacityPercent={happeningNowEvents.includes(reg) ? 84 : undefined}
                          onCancelRegistration={handleCancelRegistration}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="!p-8 text-center !border-dashed">
                      <Ticket className="h-12 w-12 text-muted mx-auto mb-4" />
                      <h3 className="font-sans text-lg font-bold text-primary mb-2">No upcoming events</h3>
                      <p className="text-sm text-secondary mb-4">Discover events and get on the guestlist!</p>
                      <Button href="/browse">Browse Events</Button>
                    </Card>
                  )}
                </section>

                {/* Past Events - Row format */}
                {pastEvents.length > 0 && (
                  <section>
                    <h2 className="section-header">Past Events</h2>
                    <div className="space-y-3">
                      {pastEvents.slice(0, 6).map((reg) => (
                        <EventCardRow
                          key={reg.id}
                          event={{
                            id: reg.event?.id || reg.event_id,
                            name: reg.event?.name || "Event",
                            slug: reg.event?.slug || "",
                            start_time: reg.event?.start_time || "",
                            end_time: reg.event?.end_time,
                            flier_url: reg.event?.flier_url,
                            cover_image_url: reg.event?.cover_image_url,
                            venue: reg.event?.venue,
                          }}
                          isPast
                          didAttend={reg.checkins && reg.checkins.length > 0}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* DJs & VENUES Tab */}
            {activeTab === "djs-venues" && (
              <>
                {/* Favorite Venues - Landscape cards */}
                <section className="mb-8">
                  <h2 className="section-header">Favorite Venues</h2>
                  {favoriteVenues.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {favoriteVenues.map((venue) => (
                        <VenueCard
                          key={venue.id}
                          venue={{
                            id: venue.id,
                            name: venue.name,
                            slug: venue.slug,
                            logo_url: venue.logo_url,
                            cover_image_url: venue.cover_image_url,
                            city: venue.city,
                            state: venue.state,
                            tags: venue.tags,
                          }}
                          layout="landscape"
                          showTags={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="!p-8 text-center !border-dashed">
                      <Heart className="h-12 w-12 text-muted mx-auto mb-4" />
                      <h3 className="font-sans text-lg font-bold text-primary mb-2">No favorite venues yet</h3>
                      <p className="text-sm text-secondary mb-4">Explore and save your favorite spots!</p>
                      <Button href="/">Browse Venues</Button>
                    </Card>
                  )}
                </section>

                {/* DJs - Coming Soon */}
                <section>
                  <h2 className="section-header">Favorite DJs</h2>
                  <Card className="!p-8 text-center !border-dashed">
                    <Users className="h-12 w-12 text-muted mx-auto mb-4" />
                    <h3 className="font-sans text-lg font-bold text-primary mb-2">Coming Soon</h3>
                    <p className="text-sm text-secondary">Follow your favorite DJs and get notified when they perform.</p>
                  </Card>
                </section>
              </>
            )}

            {/* HISTORY Tab */}
            {activeTab === "history" && (
              <section>
                <h2 className="section-header">All Activity</h2>
                {pastEvents.length > 0 ? (
                  <div className="space-y-3">
                    {pastEvents.map((reg) => (
                      <EventCardRow
                        key={reg.id}
                        event={{
                          id: reg.event?.id || reg.event_id,
                          name: reg.event?.name || "Event",
                          slug: reg.event?.slug || "",
                          start_time: reg.event?.start_time || "",
                          end_time: reg.event?.end_time,
                          flier_url: reg.event?.flier_url,
                          cover_image_url: reg.event?.cover_image_url,
                          venue: reg.event?.venue,
                        }}
                        isPast
                        didAttend={reg.checkins && reg.checkins.length > 0}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="!p-8 text-center !border-dashed">
                    <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
                    <h3 className="font-sans text-lg font-bold text-primary mb-2">No history yet</h3>
                    <p className="text-sm text-secondary">Your event history will appear here.</p>
                  </Card>
                )}
              </section>
            )}
            </div>
          </main>
          </div>
        </div>
      </div>
    </div>
  );
}
