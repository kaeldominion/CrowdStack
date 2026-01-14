"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Ticket, Heart, UserPlus, Users, X, Radio, UtensilsCrossed, Clock, MapPin, CheckCircle, AlertCircle, DollarSign } from "lucide-react";
import { Button, Card, Badge } from "@crowdstack/ui";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { EventCardRow } from "@/components/EventCardRow";
import { VenueCard } from "@/components/venue/VenueCard";
import { DJCard } from "@/components/dj/DJCard";
import { XpProgressBar, type XpProgressData } from "@/components/XpProgressBar";
import { getCurrencySymbol } from "@/lib/constants/currencies";

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

interface TableBooking {
  id: string;
  status: "pending" | "confirmed" | "completed";
  guest_name: string;
  party_size: number;
  minimum_spend: number | null;
  deposit_required: number | null;
  deposit_received: boolean;
  slot_start_time: string | null;
  slot_end_time: string | null;
  arrival_deadline: string | null;
  created_at: string;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    timezone: string | null;
    currency: string | null;
  } | null;
  venue: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    currency: string | null;
  } | null;
  table: {
    id: string;
    name: string;
    zone_name: string | null;
  } | null;
}

interface TablePartyGuest {
  id: string;
  booking_id: string;
  isGuest: true;
  host_name: string;
  party_size: number;
  minimum_spend: number | null;
  booking_status: "pending" | "confirmed" | "completed";
  slot_start_time: string | null;
  slot_end_time: string | null;
  arrival_deadline: string | null;
  joined_at: string;
  qr_token: string | null;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    timezone: string | null;
    currency: string | null;
    flier_url: string | null;
  } | null;
  venue: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    currency: string | null;
  } | null;
  table: {
    id: string;
    name: string;
    zone_name: string | null;
  } | null;
}

type TabId = "events" | "djs" | "venues" | "history" | "tables";
type MobileEventsTab = "upcoming" | "past" | "djs" | "venues" | "tables";

interface MePageClientProps {
  profile: UserProfile;
  xpData: XpProgressData | null;
  happeningNowEvents: Registration[];
  todayEvents: Registration[];
  upcomingEvents: Registration[];
  pastEvents: Registration[];
  favoriteVenues: any[];
  followedDJs: any[];
  upcomingTableBookings: TableBooking[];
  pastTableBookings: TableBooking[];
  upcomingTablePartyGuests: TablePartyGuest[];
  pastTablePartyGuests: TablePartyGuest[];
}

export function MePageClient({
  profile,
  xpData,
  happeningNowEvents,
  todayEvents,
  upcomingEvents,
  pastEvents,
  favoriteVenues,
  followedDJs,
  upcomingTableBookings,
  pastTableBookings,
  upcomingTablePartyGuests,
  pastTablePartyGuests,
}: MePageClientProps) {
  const searchParams = useSearchParams();
  const [showProfileCta, setShowProfileCta] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [mobileEventsTab, setMobileEventsTab] = useState<MobileEventsTab>("upcoming");

  // Handle ?tab= query param for deep linking
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tables") {
      setActiveTab("tables");
      setMobileEventsTab("tables");
    } else if (tabParam === "djs") {
      setActiveTab("djs");
      setMobileEventsTab("djs");
    } else if (tabParam === "venues") {
      setActiveTab("venues");
      setMobileEventsTab("venues");
    } else if (tabParam === "history") {
      setActiveTab("history");
      setMobileEventsTab("past");
    }
  }, [searchParams]);

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

  // Handle registration cancellation - refresh data (this would trigger a refresh in real implementation)
  const handleCancelRegistration = (registrationId: string) => {
    // In a real implementation, this would refresh the data
    // For now, just log it
    console.log("Cancel registration:", registrationId);
  };

  return (
    <div className="min-h-screen bg-void overscroll-none" style={{ overscrollBehavior: 'none' }}>
      {/* Mobile Layout */}
      <div className="lg:hidden relative">
        {/* Gradient Background */}
        <div className="absolute inset-x-0 top-0 h-[15rem] bg-gradient-to-br from-accent-primary/40 via-accent-secondary/30 to-accent-primary/20" />
        
        {/* Hero Section */}
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
                      sizes="128px"
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

        {/* XP Progress Bar */}
        {xpData && (
          <div className="px-4 mt-6">
            <XpProgressBar data={xpData} />
          </div>
        )}
            
        {/* Stats Row */}
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
              onClick={() => setMobileEventsTab("djs")}
              className={`tab-label ${mobileEventsTab === "djs" ? "tab-label-active" : "tab-label-inactive"}`}
            >
              DJs
            </button>
            <button
              onClick={() => setMobileEventsTab("venues")}
              className={`tab-label ${mobileEventsTab === "venues" ? "tab-label-active" : "tab-label-inactive"}`}
            >
              Venues
            </button>
            <button
              onClick={() => setMobileEventsTab("tables")}
              className={`tab-label ${mobileEventsTab === "tables" ? "tab-label-active" : "tab-label-inactive"}`}
            >
              Tables
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
                        variant={happeningNowEvents.includes(reg) ? "live" : "attending"}
                        isAttending
                        capacityPercent={happeningNowEvents.includes(reg) ? 84 : undefined}
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

          {/* DJs Tab */}
          {mobileEventsTab === "djs" && (
            <div className="space-y-3">
              {followedDJs.length > 0 ? (
                followedDJs.slice(0, 10).map((dj) => (
                  <DJCard
                    key={dj.id}
                    dj={{
                      id: dj.id,
                      name: dj.name,
                      handle: dj.handle,
                      genres: dj.genres,
                      location: dj.location,
                      profile_image_url: dj.profile_image_url,
                    }}
                    layout="row"
                  />
                ))
              ) : (
                <Card className="!p-6 text-center !border-dashed">
                  <Radio className="h-10 w-10 text-muted mx-auto mb-3" />
                  <h3 className="font-sans text-base font-bold text-primary mb-1">No DJs followed yet</h3>
                  <p className="text-sm text-secondary">Follow your favorite DJs to see them here.</p>
                </Card>
              )}
            </div>
          )}

          {/* Venues Tab */}
          {mobileEventsTab === "venues" && (
            <div className="space-y-3">
              {favoriteVenues.length > 0 ? (
                favoriteVenues.slice(0, 10).map((venue) => (
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
                ))
              ) : (
                <Card className="!p-6 text-center !border-dashed">
                  <Heart className="h-10 w-10 text-muted mx-auto mb-3" />
                  <h3 className="font-sans text-base font-bold text-primary mb-1">No favorite venues</h3>
                  <p className="text-sm text-secondary">Follow venues to see them here.</p>
                </Card>
              )}
            </div>
          )}

          {/* Tables Tab */}
          {mobileEventsTab === "tables" && (
            <div className="space-y-3">
              {/* Host bookings */}
              {upcomingTableBookings.map((booking) => (
                <TableBookingCard key={booking.id} booking={booking} />
              ))}
              {/* Guest entries */}
              {upcomingTablePartyGuests.map((guest) => (
                <TablePartyGuestCard key={guest.id} guest={guest} />
              ))}
              {/* Empty state */}
              {upcomingTableBookings.length === 0 && upcomingTablePartyGuests.length === 0 && (
                <Card className="!p-6 text-center !border-dashed">
                  <UtensilsCrossed className="h-10 w-10 text-muted mx-auto mb-3" />
                  <h3 className="font-sans text-base font-bold text-primary mb-1">No table bookings</h3>
                  <p className="text-sm text-secondary">Your table reservations will appear here.</p>
                </Card>
              )}
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
                          sizes="160px"
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
                
                {/* XP Progress Bar */}
                {xpData && (
                  <XpProgressBar data={xpData} />
                )}

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
                {/* Tab Navigation */}
                <nav className="flex gap-6 border-b border-border-subtle mb-6">
                  <button
                    onClick={() => setActiveTab("events")}
                    className={`tab-label ${activeTab === "events" ? "tab-label-active" : "tab-label-inactive"}`}
                  >
                    My Events
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={`tab-label ${activeTab === "tables" ? "tab-label-active" : "tab-label-inactive"}`}
                  >
                    Tables
                  </button>
                  <button
                    onClick={() => setActiveTab("djs")}
                    className={`tab-label ${activeTab === "djs" ? "tab-label-active" : "tab-label-inactive"}`}
                  >
                    DJs
                  </button>
                  <button
                    onClick={() => setActiveTab("venues")}
                    className={`tab-label ${activeTab === "venues" ? "tab-label-active" : "tab-label-inactive"}`}
                  >
                    Venues
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

                {/* DJs Tab */}
                {activeTab === "djs" && (
                  <section>
                    <h2 className="section-header">Followed DJs</h2>
                    {followedDJs.length > 0 ? (
                      <div className="space-y-3">
                        {followedDJs.map((dj) => (
                          <DJCard
                            key={dj.id}
                            dj={{
                              id: dj.id,
                              name: dj.name,
                              handle: dj.handle,
                              genres: dj.genres,
                              location: dj.location,
                              profile_image_url: dj.profile_image_url,
                            }}
                            layout="row"
                          />
                        ))}
                      </div>
                    ) : (
                      <Card className="!p-8 text-center !border-dashed">
                        <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
                        <h3 className="font-sans text-lg font-bold text-primary mb-2">No DJs followed yet</h3>
                        <p className="text-sm text-secondary mb-4">Follow your favorite DJs to see them here!</p>
                        <Button href="/browse">Browse Events</Button>
                      </Card>
                    )}
                  </section>
                )}

                {/* VENUES Tab */}
                {activeTab === "venues" && (
                  <section>
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
                )}

                {/* HISTORY Tab */}
                {activeTab === "history" && (
                  <section>
                    <h2 className="section-header">Event History</h2>
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

                {/* TABLES Tab */}
                {activeTab === "tables" && (
                  <>
                    {/* Upcoming Table Bookings & Guest Entries */}
                    <section className="mb-8">
                      <h2 className="section-header">Upcoming Table Reservations</h2>
                      {upcomingTableBookings.length > 0 || upcomingTablePartyGuests.length > 0 ? (
                        <div className="space-y-3">
                          {upcomingTableBookings.map((booking) => (
                            <TableBookingCard key={booking.id} booking={booking} />
                          ))}
                          {upcomingTablePartyGuests.map((guest) => (
                            <TablePartyGuestCard key={guest.id} guest={guest} />
                          ))}
                        </div>
                      ) : (
                        <Card className="!p-8 text-center !border-dashed">
                          <UtensilsCrossed className="h-12 w-12 text-muted mx-auto mb-4" />
                          <h3 className="font-sans text-lg font-bold text-primary mb-2">No table reservations</h3>
                          <p className="text-sm text-secondary mb-4">Book a table at your favorite event!</p>
                          <Button href="/browse">Browse Events</Button>
                        </Card>
                      )}
                    </section>

                    {/* Past Table Bookings & Guest Entries */}
                    {(pastTableBookings.length > 0 || pastTablePartyGuests.length > 0) && (
                      <section>
                        <h2 className="section-header">Past Table Reservations</h2>
                        <div className="space-y-3">
                          {pastTableBookings.map((booking) => (
                            <TableBookingCard key={booking.id} booking={booking} isPast />
                          ))}
                          {pastTablePartyGuests.map((guest) => (
                            <TablePartyGuestCard key={guest.id} guest={guest} isPast />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table Booking Card Component
function TableBookingCard({ booking, isPast = false }: { booking: TableBooking; isPast?: boolean }) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const currency = booking.event?.currency || booking.venue?.currency || "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatBookedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/booking/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Reload to refresh the data
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking");
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case "pending":
        return <Badge color="amber">Pending Confirmation</Badge>;
      case "confirmed":
        return <Badge color="green">Confirmed</Badge>;
      case "completed":
        return <Badge color="blue">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card className={isPast ? "opacity-60" : ""}>
        <div className="flex items-start gap-3">
          {/* Table Icon */}
          <div className="w-10 h-10 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-accent-primary" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-sm font-semibold text-primary">
                {booking.table?.name || "Table"}
              </h3>
              {booking.table?.zone_name && (
                <span className="text-xs text-muted">• {booking.table.zone_name}</span>
              )}
              {getStatusBadge()}
            </div>

            <Link
              href={`/e/${booking.event?.slug}`}
              className="text-sm text-accent-secondary hover:underline block mb-1.5"
            >
              {booking.event?.name || "Event"}
            </Link>

            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-secondary">
              {booking.event?.start_time && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted" />
                  {formatDate(booking.event.start_time)}
                </span>
              )}
              {booking.slot_start_time ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted" />
                  {formatTime(booking.slot_start_time)}
                  {booking.slot_end_time && ` - ${formatTime(booking.slot_end_time)}`}
                </span>
              ) : booking.event?.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted" />
                  {formatTime(booking.event.start_time)}
                </span>
              )}
              {booking.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted" />
                  {booking.venue.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted" />
                {booking.party_size} guests
              </span>
            </div>

            {/* Financial Info */}
            {(booking.minimum_spend || booking.deposit_required) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1.5">
                {booking.minimum_spend && (
                  <span className="text-muted">
                    Min: {currencySymbol}{booking.minimum_spend.toLocaleString()}
                  </span>
                )}
                {booking.deposit_required && (
                  <span className={booking.deposit_received ? "text-accent-success" : "text-accent-warning"}>
                    {booking.deposit_received ? (
                      <CheckCircle className="h-3 w-3 inline mr-0.5" />
                    ) : (
                      <AlertCircle className="h-3 w-3 inline mr-0.5" />
                    )}
                    Deposit {booking.deposit_received ? "paid" : "pending"}
                  </span>
                )}
              </div>
            )}

            {/* Arrival Deadline */}
            {booking.arrival_deadline && !isPast && (
              <div className="mt-1.5 text-xs text-accent-warning flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Arrive by {formatTime(booking.arrival_deadline)}
              </div>
            )}

            {/* Booked on */}
            {booking.created_at && (
              <div className="mt-1.5 pt-1.5 border-t border-border-subtle text-xs text-muted">
                Booked {formatBookedDate(booking.created_at)}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isPast && booking.status !== "completed" && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Button size="sm" href={`/booking/${booking.id}`}>
                View Details
              </Button>
              {booking.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCancelModal(true)}
                  className="text-accent-error hover:bg-accent-error/10"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-base font-semibold text-primary mb-2">Cancel Table Booking?</h3>
            <p className="text-sm text-secondary mb-3">
              Are you sure you want to cancel your table at{" "}
              <span className="text-primary">{booking.event?.name}</span>?
            </p>
            <p className="text-xs text-accent-warning mb-4">
              Note: Deposits are non-refundable for guest cancellations.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowCancelModal(false)}>
                Keep Booking
              </Button>
              <Button
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-accent-error hover:bg-accent-error/80"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

// Table Party Guest Card Component (for invited guests, not hosts)
function TablePartyGuestCard({ guest, isPast = false }: { guest: TablePartyGuest; isPast?: boolean }) {
  const currency = guest.event?.currency || guest.venue?.currency || "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatJoinedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Card className={isPast ? "opacity-60" : ""}>
      <div className="flex items-start gap-3">
        {/* Table Icon */}
        <div className="w-10 h-10 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-accent-secondary" />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-sm font-semibold text-primary">
              {guest.table?.name || "Table"}
            </h3>
            {guest.table?.zone_name && (
              <span className="text-xs text-muted">• {guest.table.zone_name}</span>
            )}
            <Badge color="blue" size="sm">Guest</Badge>
          </div>

          <Link
            href={`/e/${guest.event?.slug}`}
            className="text-sm text-accent-secondary hover:underline block mb-1"
          >
            {guest.event?.name || "Event"}
          </Link>

          {/* Host info */}
          <div className="text-xs text-muted mb-1.5">
            Hosted by {guest.host_name}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-secondary">
            {guest.event?.start_time && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted" />
                {formatDate(guest.event.start_time)}
              </span>
            )}
            {guest.slot_start_time ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted" />
                {formatTime(guest.slot_start_time)}
                {guest.slot_end_time && ` - ${formatTime(guest.slot_end_time)}`}
              </span>
            ) : guest.event?.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted" />
                {formatTime(guest.event.start_time)}
              </span>
            )}
            {guest.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted" />
                {guest.venue.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted" />
              {guest.party_size} guests
            </span>
          </div>

          {/* Minimum Spend Info */}
          {guest.minimum_spend && (
            <div className="text-xs text-muted mt-1.5">
              Min: {currencySymbol}{guest.minimum_spend.toLocaleString()}
            </div>
          )}

          {/* Arrival Deadline */}
          {guest.arrival_deadline && !isPast && (
            <div className="mt-1.5 text-xs text-accent-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Arrive by {formatTime(guest.arrival_deadline)}
            </div>
          )}

          {/* Joined on */}
          {guest.joined_at && (
            <div className="mt-1.5 pt-1.5 border-t border-border-subtle text-xs text-muted">
              Joined {formatJoinedDate(guest.joined_at)}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isPast && guest.booking_status !== "completed" && (
          <div className="flex-shrink-0">
            <Button size="sm" href={`/table-pass/${guest.id}`}>
              View Pass
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

