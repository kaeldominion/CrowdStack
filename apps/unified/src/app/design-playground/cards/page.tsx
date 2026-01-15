"use client";

/**
 * DESIGN PLAYGROUND - CARD COMPONENTS
 * 
 * Private dev-only page for standardizing card components.
 * Route: /design-playground/cards
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 * 
 * ============================================
 * IMPORTANT: EDITING INSTRUCTIONS
 * ============================================
 * 
 * This page is a PREVIEW ONLY - it uses mock data to display real components.
 * 
 * When making design changes, edit the SOURCE COMPONENT FILES:
 * 
 * MASTER COMPONENTS:
 * - VenueCard:         /apps/unified/src/components/venue/VenueCard.tsx
 * - DJCard:            /apps/unified/src/components/dj/DJCard.tsx
 * - AttendeeEventCard: /apps/unified/src/components/AttendeeEventCard.tsx
 * - EventCardCompact:  /apps/unified/src/components/EventCardCompact.tsx
 * - EventCardRow:      /apps/unified/src/components/EventCardRow.tsx
 * - VenueEventCard:    /apps/unified/src/components/venue/EventCard.tsx (for venue pages)
 * 
 * ADMIN COMPONENTS (separate purpose):
 * - AdminEventCard:    /apps/unified/src/components/events/EventCard.tsx (dashboard use)
 * 
 * PRIMITIVES & TOKENS:
 * - Card primitive:    /packages/ui/src/components/Card.tsx
 * - Global styles:     /apps/unified/src/app/globals.css
 * - Design tokens:     /styles/tokens.css
 * 
 * DO NOT add local style overrides in this playground file.
 * All changes should be made at the source for global consistency.
 * ============================================
 */

import { useState } from "react";
import { Card, Badge } from "@crowdstack/ui";
import { VenueCard } from "@/components/venue/VenueCard";
import { DJCard, DJCardSkeleton } from "@/components/dj/DJCard";
import { EventCard as VenueEventCard } from "@/components/venue/EventCard";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { EventCardCompact } from "@/components/EventCardCompact";
import { EventCardRow } from "@/components/EventCardRow";
import { MapPin, Calendar, Radio, ExternalLink, Eye } from "lucide-react";

// ============================================
// MOCK DATA
// ============================================

const MOCK_VENUE = {
  id: "venue-1",
  name: "Jade by Todd English",
  slug: "jade-by-todd-english",
  tagline: "Where East meets West in culinary excellence",
  description: "An upscale Asian fusion restaurant with stunning views",
  logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop",
  cover_image_url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=800&fit=crop",
  city: "Dubai",
  state: "UAE",
  country: "United Arab Emirates",
  tags: [
    { tag_type: "music", tag_value: "House" },
    { tag_type: "music", tag_value: "Hip-Hop" },
    { tag_type: "crowd_type", tag_value: "Upscale" },
    { tag_type: "dress_code", tag_value: "Smart Casual" },
  ],
};

const MOCK_VENUE_NO_IMAGE = {
  ...MOCK_VENUE,
  id: "venue-2",
  name: "Mystery Lounge",
  slug: "mystery-lounge",
  logo_url: null,
  cover_image_url: null,
};

const MOCK_EVENT = {
  id: "event-1",
  name: "Friday Night Sessions",
  slug: "friday-night-sessions",
  start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
  flier_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=800&fit=crop",
  cover_image_url: null,
  capacity: 200,
  registration_count: 145,
  has_guestlist: true,
  ticket_sale_mode: "none" as const,
  venue: {
    name: "Jade by Todd English",
    city: "Dubai",
  },
};

const MOCK_EVENT_TODAY = {
  ...MOCK_EVENT,
  id: "event-2",
  name: "House Music Tonight",
  slug: "house-music-tonight",
  start_time: new Date().toISOString(),
};

const MOCK_EVENT_NO_IMAGE = {
  ...MOCK_EVENT,
  id: "event-3",
  name: "Deep Sessions",
  slug: "deep-sessions",
  flier_url: null,
  cover_image_url: null,
};

const MOCK_EVENT_PAST = {
  ...MOCK_EVENT,
  id: "event-4",
  name: "Last Week's Vibes",
  slug: "last-weeks-vibes",
  start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  end_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
};

const MOCK_REGISTRATION = {
  id: "reg-1",
  checkins: [],
};

// Guestlist event (Join Guestlist button)
const MOCK_EVENT_GUESTLIST = {
  ...MOCK_EVENT,
  id: "event-guestlist",
  name: "Guestlist Event",
  slug: "guestlist-event",
  has_guestlist: true,
  ticket_sale_mode: "none" as const,
  external_ticket_url: null,
};

// External ticket event (Get Tickets / Buy Tickets button)
const MOCK_EVENT_EXTERNAL = {
  ...MOCK_EVENT,
  id: "event-external",
  name: "External Ticket Event",
  slug: "external-ticket-event",
  has_guestlist: false,
  ticket_sale_mode: "external" as const,
  external_ticket_url: "https://ra.co/events/example",
  capacity: null, // No capacity tracking for external
  registration_count: 0,
};

// Display only event (Info Only button)
const MOCK_EVENT_DISPLAY_ONLY = {
  ...MOCK_EVENT,
  id: "event-display",
  name: "Display Only Event",
  slug: "display-only-event",
  has_guestlist: false,
  ticket_sale_mode: "none" as const,
  external_ticket_url: null,
  capacity: null,
  registration_count: 0,
};

// DJ Mock Data
const MOCK_DJ = {
  id: "dj-1",
  name: "DJ Kadian",
  handle: "kadian",
  bio: "House and techno DJ based in Dubai. Resident at the best clubs in the city. Playing underground sounds since 2015.",
  genres: ["House", "Techno", "Deep House", "Tech House"],
  location: "Dubai, UAE",
  profile_image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&h=400&fit=crop",
  cover_image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop",
  follower_count: 1247,
  event_count: 42,
};

const MOCK_DJ_NO_IMAGE = {
  ...MOCK_DJ,
  id: "dj-2",
  name: "Underground Selector",
  handle: "underground-selector",
  bio: "Curating the finest underground selections from around the world.",
  profile_image_url: null,
  cover_image_url: null,
  follower_count: 856,
  event_count: 28,
};

const MOCK_DJ_MINIMAL = {
  id: "dj-3",
  name: "Beatmaster",
  handle: "beatmaster",
  bio: null,
  genres: ["Hip-Hop"],
  location: null,
  profile_image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
  cover_image_url: null,
  follower_count: null,
  event_count: null,
};

// ============================================
// COMPONENT SECTIONS
// ============================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-sans text-2xl font-black text-primary uppercase tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
    </div>
  );
}

function CardGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: number }) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };
  return <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} gap-6`}>{children}</div>;
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
      {children}
    </p>
  );
}

// ============================================
// SKELETON CARDS
// ============================================

function VenueCardSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border-subtle bg-void animate-pulse">
      <div className="h-[400px]">
        <div className="absolute inset-0 bg-raised" />
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className="h-6 w-3/4 bg-glass rounded" />
          <div className="h-4 w-1/2 bg-glass rounded" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-glass rounded-full" />
            <div className="h-6 w-16 bg-glass rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border-subtle bg-void animate-pulse">
      <div className="aspect-[3/4] min-h-[380px]">
        <div className="absolute inset-0 bg-raised" />
        <div className="absolute top-4 left-4">
          <div className="h-7 w-24 bg-glass rounded-md" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className="h-4 w-1/3 bg-glass rounded" />
          <div className="h-8 w-3/4 bg-glass rounded" />
          <div className="h-10 w-full bg-glass rounded-md" />
        </div>
      </div>
    </div>
  );
}

function RowCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-border-subtle bg-void animate-pulse">
      <div className="h-20 w-28 rounded-xl bg-raised" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-3/4 bg-glass rounded" />
        <div className="h-4 w-1/2 bg-glass rounded" />
        <div className="h-4 w-1/3 bg-glass rounded" />
      </div>
    </div>
  );
}

function CompactCardSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-border-subtle bg-glass animate-pulse">
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-raised flex-shrink-0" />
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="h-3 w-24 bg-raised rounded" />
        <div className="h-6 w-3/4 bg-raised rounded" />
        <div className="h-4 w-1/2 bg-raised rounded" />
        <div className="flex gap-2 mt-auto">
          <div className="h-10 w-36 bg-raised rounded-lg" />
          <div className="h-10 w-10 bg-raised rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function DesignCardsPage() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-void/95 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-sans text-3xl font-black text-primary uppercase tracking-tighter">
                Design Playground
              </h1>
              <p className="text-sm text-secondary">Card Component Standardization</p>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        
        {/* ============================================ */}
        {/* VENUE CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Venue Cards" 
            subtitle="VenueCard component with portrait, landscape, and row variants"
          />
          
          {/* Portrait Layout */}
          <div className="mb-8">
            <CardLabel>Portrait / Full Card</CardLabel>
            <CardGrid columns={3}>
              <VenueCard venue={MOCK_VENUE} showTags layout="portrait" />
              <VenueCard venue={MOCK_VENUE} showTags={false} layout="portrait" />
              <VenueCard venue={MOCK_VENUE_NO_IMAGE} showTags layout="portrait" />
            </CardGrid>
          </div>

          {/* Landscape Layout */}
          <div className="mb-8">
            <CardLabel>Landscape / Compact Card</CardLabel>
            <CardGrid columns={3}>
              <VenueCard venue={MOCK_VENUE} layout="landscape" />
              <VenueCard venue={MOCK_VENUE} showTags={false} layout="landscape" />
              <VenueCard venue={MOCK_VENUE_NO_IMAGE} layout="landscape" />
            </CardGrid>
          </div>

          {/* Skeleton States */}
          <div className="mb-8">
            <CardLabel>Skeleton / Loading State</CardLabel>
            <CardGrid columns={3}>
              <VenueCardSkeleton />
              <div className="flex items-center gap-4 p-3 rounded-xl border border-border-subtle bg-void animate-pulse">
                <div className="h-24 w-24 rounded-xl bg-raised flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-glass rounded" />
                  <div className="h-4 w-1/2 bg-glass rounded" />
                </div>
              </div>
            </CardGrid>
          </div>
        </section>

        {/* ============================================ */}
        {/* DJ CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="DJ Cards" 
            subtitle="DJCard component with portrait, row, and compact variants"
          />

          {/* Portrait Layout */}
          <div className="mb-8">
            <CardLabel>Portrait / Full Card (with bio, stats, genres)</CardLabel>
            <CardGrid columns={3}>
              <DJCard dj={MOCK_DJ} layout="portrait" />
              <DJCard dj={MOCK_DJ_NO_IMAGE} layout="portrait" />
              <DJCard dj={MOCK_DJ_MINIMAL} layout="portrait" />
            </CardGrid>
          </div>

          {/* Portrait without extras */}
          <div className="mb-8">
            <CardLabel>Portrait / Minimal (no bio, no stats)</CardLabel>
            <CardGrid columns={3}>
              <DJCard dj={MOCK_DJ} layout="portrait" showBio={false} showStats={false} />
              <DJCard dj={MOCK_DJ} layout="portrait" showGenres={false} showBio={false} />
            </CardGrid>
          </div>

          {/* Row Layout */}
          <div className="mb-8">
            <CardLabel>Row / List Format (with bio, stats, genres)</CardLabel>
            <div className="space-y-3 max-w-3xl">
              <DJCard dj={MOCK_DJ} layout="row" />
              <DJCard dj={MOCK_DJ_NO_IMAGE} layout="row" />
              <DJCard dj={MOCK_DJ_MINIMAL} layout="row" />
            </div>
          </div>

          {/* Row without extras */}
          <div className="mb-8">
            <CardLabel>Row / Minimal (no bio, no stats)</CardLabel>
            <div className="space-y-3 max-w-3xl">
              <DJCard dj={MOCK_DJ} layout="row" showBio={false} showStats={false} />
              <DJCard dj={MOCK_DJ} layout="row" showBio={false} showStats={false} maxGenres={2} />
            </div>
          </div>

          {/* Compact Layout */}
          <div className="mb-8">
            <CardLabel>Compact / Minimal (for lineups, lists)</CardLabel>
            <div className="max-w-md space-y-1 bg-glass rounded-xl p-2 border border-border-subtle">
              <DJCard dj={MOCK_DJ} layout="compact" />
              <DJCard dj={MOCK_DJ_MINIMAL} layout="compact" />
              <DJCard dj={MOCK_DJ_NO_IMAGE} layout="compact" />
            </div>
          </div>

          {/* Skeleton States */}
          <div className="mb-8">
            <CardLabel>Skeleton / Loading State</CardLabel>
            <CardGrid columns={3}>
              <DJCardSkeleton layout="portrait" />
              <DJCardSkeleton layout="portrait" />
            </CardGrid>
            <div className="space-y-3 max-w-3xl mt-6">
              <DJCardSkeleton layout="row" />
              <DJCardSkeleton layout="row" />
            </div>
            <div className="max-w-md space-y-1 bg-glass rounded-xl p-2 border border-border-subtle mt-6">
              <DJCardSkeleton layout="compact" />
              <DJCardSkeleton layout="compact" />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* EVENT CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Event Cards" 
            subtitle="AttendeeEventCard component with full, compact, and row variants"
          />

          {/* Full Card Variants */}
          <div className="mb-8">
            <CardLabel>Full Card - Default State</CardLabel>
            <CardGrid columns={3}>
              <AttendeeEventCard event={MOCK_EVENT} variant="default" />
              <AttendeeEventCard event={MOCK_EVENT} variant="default" badgeText="VIP ACCESS" />
              <AttendeeEventCard event={MOCK_EVENT_NO_IMAGE} variant="default" />
            </CardGrid>
          </div>

          <div className="mb-8">
            <CardLabel>Full Card - Attending State</CardLabel>
            <CardGrid columns={3}>
              <AttendeeEventCard event={MOCK_EVENT} registration={MOCK_REGISTRATION} variant="attending" isAttending />
              <AttendeeEventCard event={MOCK_EVENT} registration={MOCK_REGISTRATION} variant="attending" isAttending showVip />
              <AttendeeEventCard event={MOCK_EVENT_TODAY} registration={MOCK_REGISTRATION} variant="attending" isAttending />
            </CardGrid>
          </div>

          <div className="mb-8">
            <CardLabel>Full Card - Live State</CardLabel>
            <CardGrid columns={3}>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <AttendeeEventCard event={MOCK_EVENT_TODAY} variant="live" capacityPercent={75} />
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <AttendeeEventCard event={MOCK_EVENT_TODAY} variant="live" capacityPercent={95} />
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <AttendeeEventCard event={MOCK_EVENT_NO_IMAGE} variant="live" capacityPercent={50} />
                </div>
              </div>
            </CardGrid>
          </div>

          {/* Row Variants */}
          <div className="mb-8">
            <CardLabel>Row / List Format</CardLabel>
            <div className="space-y-3 max-w-3xl">
              <EventCardRow event={MOCK_EVENT} />
              <EventCardRow event={MOCK_EVENT} registration={MOCK_REGISTRATION} />
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <EventCardRow event={MOCK_EVENT_TODAY} isLive />
                </div>
              </div>
              <EventCardRow event={MOCK_EVENT_NO_IMAGE} />
            </div>
          </div>

          {/* Compact Horizontal Cards */}
          <div className="mb-8">
            <CardLabel>Compact / Half-Size (Horizontal)</CardLabel>
            <CardGrid columns={3}>
              <EventCardCompact 
                event={MOCK_EVENT} 
                registration={MOCK_REGISTRATION}
              />
              <EventCardCompact 
                event={MOCK_EVENT} 
                registration={MOCK_REGISTRATION}
                showVip
              />
              <EventCardCompact 
                event={MOCK_EVENT_TODAY} 
                registration={MOCK_REGISTRATION}
                badgeText="EARLY BIRD"
              />
              <EventCardCompact 
                event={MOCK_EVENT_NO_IMAGE}
              />
              <EventCardCompact 
                event={MOCK_EVENT}
                registration={MOCK_REGISTRATION}
                onMore={() => console.log("More clicked")}
              />
            </CardGrid>
          </div>

          {/* Compact Live Cards with Glowing Background */}
          <div className="mb-8">
            <CardLabel>Compact - Live (with Glowing Pulsing Background)</CardLabel>
            <CardGrid columns={3}>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <EventCardCompact 
                    event={MOCK_EVENT_TODAY} 
                    registration={MOCK_REGISTRATION}
                  />
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <EventCardCompact 
                    event={MOCK_EVENT_TODAY} 
                    registration={MOCK_REGISTRATION}
                    showVip
                  />
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
                <div className="relative">
                  <EventCardCompact 
                    event={MOCK_EVENT_TODAY}
                  />
                </div>
              </div>
            </CardGrid>
          </div>

          {/* CTA Button Variants */}
          <div className="mb-8">
            <CardLabel>CTA Button Variants</CardLabel>
            <p className="text-sm text-muted mb-4">
              Different call-to-action buttons based on event configuration and user state.
            </p>

            <CardGrid columns={4}>
              {/* Request Guestlist - Default unregistered state */}
              <div>
                <p className="text-xs text-secondary mb-2 font-mono">JOIN GUESTLIST</p>
                <p className="text-[10px] text-muted mb-2">has_guestlist: true</p>
                <AttendeeEventCard event={MOCK_EVENT_GUESTLIST} />
              </div>

              {/* View Pass - Registered state */}
              <div>
                <p className="text-xs text-secondary mb-2 font-mono">VIEW PASS</p>
                <p className="text-[10px] text-muted mb-2">Registered user</p>
                <AttendeeEventCard event={MOCK_EVENT_GUESTLIST} registration={MOCK_REGISTRATION} />
              </div>

              {/* Get Tickets - External ticket sale */}
              <div>
                <p className="text-xs text-secondary mb-2 font-mono">GET TICKETS</p>
                <p className="text-[10px] text-muted mb-2">ticket_sale_mode: &quot;external&quot;</p>
                <AttendeeEventCard event={MOCK_EVENT_EXTERNAL} />
              </div>

              {/* Info Only - Display only */}
              <div>
                <p className="text-xs text-secondary mb-2 font-mono">INFO ONLY</p>
                <p className="text-[10px] text-muted mb-2">has_guestlist: false</p>
                <AttendeeEventCard event={MOCK_EVENT_DISPLAY_ONLY} />
              </div>
            </CardGrid>
          </div>

          {/* External Ticket Events */}
          <div className="mb-8">
            <CardLabel>External Ticket Events</CardLabel>
            <p className="text-sm text-muted mb-4">
              Events where tickets are sold externally (RA, Eventbrite, etc.).
              Use <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">ticket_sale_mode=&quot;external&quot;</code> with <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">external_ticket_url</code>.
            </p>

            <div className="space-y-3 max-w-3xl mb-6">
              <EventCardRow event={MOCK_EVENT_EXTERNAL} />
            </div>

            <CardGrid columns={3}>
              <AttendeeEventCard event={MOCK_EVENT_EXTERNAL} />
              <EventCardCompact event={MOCK_EVENT_EXTERNAL} />
            </CardGrid>
          </div>

          {/* Display Only Events */}
          <div className="mb-8">
            <CardLabel>Display Only Events</CardLabel>
            <p className="text-sm text-muted mb-4">
              Events shown for info only, no registration.
              Use <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">has_guestlist=false</code> and <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">ticket_sale_mode=&quot;none&quot;</code>.
            </p>

            <div className="space-y-3 max-w-3xl mb-6">
              <EventCardRow event={MOCK_EVENT_DISPLAY_ONLY} />
            </div>

            <CardGrid columns={3}>
              <AttendeeEventCard event={MOCK_EVENT_DISPLAY_ONLY} />
              <EventCardCompact event={MOCK_EVENT_DISPLAY_ONLY} />
            </CardGrid>
          </div>

          {/* Guestlist Closed State */}
          <div className="mb-8">
            <CardLabel>Guestlist Closed (Upcoming Event, Full Capacity)</CardLabel>
            <p className="text-sm text-muted mb-4">
              When guestlist is closed but event hasn&apos;t started yet. 
              Use <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">isGuestlistClosed=true</code> prop.
            </p>
            
            <div className="space-y-3 max-w-3xl mb-6">
              <EventCardRow event={MOCK_EVENT} isGuestlistClosed />
              <EventCardRow event={MOCK_EVENT_NO_IMAGE} isGuestlistClosed />
            </div>

            <CardGrid columns={3}>
              <AttendeeEventCard event={MOCK_EVENT} isGuestlistClosed />
              <EventCardCompact event={MOCK_EVENT} isGuestlistClosed />
            </CardGrid>
          </div>

          {/* Past Events State */}
          <div className="mb-8">
            <CardLabel>Past Events (Event Ended)</CardLabel>
            <p className="text-sm text-muted mb-4">
              When events have ended.
              Use <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">isPast=true</code> prop.
            </p>
            
            {/* Row Cards - Past State (recommended for history views) */}
            <div className="space-y-3 max-w-3xl mb-6">
              <EventCardRow event={MOCK_EVENT_PAST} isPast />
              <EventCardRow event={MOCK_EVENT_PAST} isPast didAttend />
              <EventCardRow event={MOCK_EVENT_NO_IMAGE} isPast />
            </div>

            {/* Full Cards - with isPast prop */}
            <CardGrid columns={3}>
              <AttendeeEventCard event={MOCK_EVENT_PAST} isPast />
              <EventCardCompact event={MOCK_EVENT_PAST} isPast />
            </CardGrid>
            
            {/* Guestlist Card - Past State Reference */}
            <div className="mt-6">
              <CardLabel>Guestlist Card - Closed State (Public Event Page)</CardLabel>
              <div className="max-w-sm">
                <Card padding="compact">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Guestlist
                    </h3>
                    <Badge color="slate" variant="solid" size="sm">
                      Closed
                    </Badge>
                  </div>
                  
                  {/* Entry Option */}
                  <div className="flex items-center justify-between p-3 mt-3 rounded-lg bg-raised/80 border border-border-subtle opacity-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary">Standard Entry</p>
                      <p className="text-[11px] text-muted">Event Ended</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-bold text-primary">Free</span>
                    </div>
                  </div>
                  
                  {/* Disclaimer */}
                  <p className="text-[10px] text-muted text-center mt-3 mb-4">
                    This event has ended.
                  </p>
                  
                  {/* CTA - Disabled */}
                  <button 
                    disabled
                    className="w-full py-3 px-4 rounded-xl bg-raised border border-border-subtle text-muted font-mono uppercase tracking-wider text-sm opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Guestlist Closed
                  </button>
                </Card>
              </div>
            </div>
          </div>

          {/* Skeleton States */}
          <div className="mb-8">
            <CardLabel>Skeleton / Loading State</CardLabel>
            <CardGrid columns={3}>
              <EventCardSkeleton />
              <EventCardSkeleton />
            </CardGrid>
            <div className="space-y-3 max-w-3xl mt-6">
              <RowCardSkeleton />
              <RowCardSkeleton />
            </div>
            <div className="mt-6">
              <CardLabel>Compact Skeleton</CardLabel>
              <CardGrid columns={3}>
                <CompactCardSkeleton />
                <CompactCardSkeleton />
                <CompactCardSkeleton />
              </CardGrid>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* VENUE PAGE EVENT CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Venue Page Event Cards" 
            subtitle="EventCard component for venue pages (venue/EventCard.tsx)"
          />

          <div className="mb-8">
            <CardLabel>Venue Event Cards</CardLabel>
            <CardGrid columns={3}>
              <VenueEventCard 
                event={{
                  id: "ve-1",
                  slug: "friday-night-sessions",
                  name: "Friday Night Sessions",
                  description: "The best house music in town",
                  start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                  end_time: null,
                  cover_image_url: null,
                  flier_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=800&fit=crop",
                  capacity: 500,
                  registration_count: 142,
                }} 
              />
              <VenueEventCard 
                event={{
                  id: "ve-2",
                  slug: "live-event",
                  name: "Saturday Night Live",
                  description: null,
                  start_time: new Date().toISOString(),
                  end_time: null,
                  cover_image_url: null,
                  flier_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=800&fit=crop",
                  capacity: 300,
                  registration_count: 89,
                }}
                isLive
              />
              <VenueEventCard 
                event={{
                  id: "ve-3",
                  slug: "no-image-event",
                  name: "Underground Sessions",
                  description: "Deep house and techno",
                  start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  end_time: null,
                  cover_image_url: null,
                  flier_url: null,
                  capacity: 200,
                  registration_count: 0,
                }} 
              />
            </CardGrid>
          </div>
        </section>

        {/* ============================================ */}
        {/* EMPTY STATES */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Empty States" 
            subtitle="When there's no data to display"
          />
          
          <CardGrid columns={3}>
            <Card className="!p-8 text-center border-dashed">
              <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No upcoming events</h3>
              <p className="text-sm text-secondary">Check back soon for new events!</p>
            </Card>
            
            <Card className="!p-8 text-center border-dashed">
              <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No DJs found</h3>
              <p className="text-sm text-secondary">Try adjusting your search or filters.</p>
            </Card>
            
            <Card className="!p-8 text-center border-dashed">
              <MapPin className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No favorite venues</h3>
              <p className="text-sm text-secondary">Explore venues and add your favorites!</p>
            </Card>
          </CardGrid>
        </section>

        {/* ============================================ */}
        {/* DESIGN TOKENS REFERENCE */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Design Tokens Reference" 
            subtitle="Quick reference for styling consistency"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colors */}
            <Card padding="compact">
              <h4 className="font-sans text-sm font-bold text-primary mb-3">Background Colors</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-void border border-border-subtle" />
                  <span className="font-mono text-xs text-secondary">bg-void</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-glass border border-border-subtle" />
                  <span className="font-mono text-xs text-secondary">bg-glass</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-raised border border-border-subtle" />
                  <span className="font-mono text-xs text-secondary">bg-raised</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-active border border-border-subtle" />
                  <span className="font-mono text-xs text-secondary">bg-active</span>
                </div>
              </div>
            </Card>

            {/* Text Colors */}
            <Card padding="compact">
              <h4 className="font-sans text-sm font-bold text-primary mb-3">Text Colors</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-primary font-medium">Primary Text</span>
                  <span className="font-mono text-xs text-muted">text-primary</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-secondary font-medium">Secondary Text</span>
                  <span className="font-mono text-xs text-muted">text-secondary</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted font-medium">Muted Text</span>
                  <span className="font-mono text-xs text-muted">text-muted</span>
                </div>
              </div>
            </Card>

            {/* Accents */}
            <Card padding="compact">
              <h4 className="font-sans text-sm font-bold text-primary mb-3">Accent Colors</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-accent-primary" />
                  <span className="font-mono text-xs text-secondary">accent-primary (purple)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-accent-secondary" />
                  <span className="font-mono text-xs text-secondary">accent-secondary (cyan)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-accent-success" />
                  <span className="font-mono text-xs text-secondary">accent-success (green)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-accent-error" />
                  <span className="font-mono text-xs text-secondary">accent-error (red)</span>
                </div>
              </div>
            </Card>

            {/* Borders */}
            <Card padding="compact">
              <h4 className="font-sans text-sm font-bold text-primary mb-3">Border Styles</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-8 rounded border border-border-subtle" />
                  <span className="font-mono text-xs text-secondary">border-border-subtle</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-8 rounded border border-border-strong" />
                  <span className="font-mono text-xs text-secondary">border-border-strong</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-8 rounded border-2 border-accent-primary/50" />
                  <span className="font-mono text-xs text-secondary">border-accent-primary/50 (hover)</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* HOVER BEHAVIOR */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Hover Behavior" 
            subtitle="Interactive states and transitions"
          />
          
          <p className="text-sm text-secondary mb-4">
            Hover over cards to see transitions. Target: <code className="font-mono text-xs bg-glass px-1 py-0.5 rounded">transition-all duration-normal ease-default</code>
          </p>
          
          <CardGrid columns={2}>
            <div>
              <CardLabel>Card with hover glow</CardLabel>
              <VenueCard venue={MOCK_VENUE} layout="portrait" />
            </div>
            <div>
              <CardLabel>Card with image scale</CardLabel>
              <AttendeeEventCard event={MOCK_EVENT} variant="default" />
            </div>
          </CardGrid>
        </section>

      </div>
    </div>
  );
}

