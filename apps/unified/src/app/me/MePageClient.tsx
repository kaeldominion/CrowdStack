"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Calendar, Ticket, Heart, UserPlus, Users, X, Radio } from "lucide-react";
import { Button, Card } from "@crowdstack/ui";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { EventCardRow } from "@/components/EventCardRow";
import { VenueCard } from "@/components/venue/VenueCard";
import { DJCard } from "@/components/dj/DJCard";
import { XpProgressBar, type XpProgressData } from "@/components/XpProgressBar";
import { ActivityLog } from "@/components/ActivityLog";

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

type TabId = "events" | "djs" | "venues" | "history" | "activity";
type MobileEventsTab = "upcoming" | "past" | "djs" | "venues";

interface MePageClientProps {
  profile: UserProfile;
  xpData: XpProgressData | null;
  happeningNowEvents: Registration[];
  todayEvents: Registration[];
  upcomingEvents: Registration[];
  pastEvents: Registration[];
  favoriteVenues: any[];
  followedDJs: any[];
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
}: MePageClientProps) {
  const [showProfileCta, setShowProfileCta] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [mobileEventsTab, setMobileEventsTab] = useState<MobileEventsTab>("upcoming");

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
                  <button 
                    onClick={() => setActiveTab("activity")}
                    className={`tab-label ${activeTab === "activity" ? "tab-label-active" : "tab-label-inactive"}`}
                  >
                    Activity
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

                {/* ACTIVITY Tab */}
                {activeTab === "activity" && (
                  <section>
                    <ActivityLog
                      title="Your Activity"
                      showFilters={true}
                      limit={50}
                    />
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

