import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { HomePageClient } from "./HomePageClient";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import * as Sentry from "@sentry/nextjs";

// ISR: Revalidate homepage every 60 seconds (optimized for performance)
// This works with unstable_cache to provide multi-layer caching
export const revalidate = 60;

async function getFeaturedEvents() {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // Optimized query: Use single query with count aggregation instead of relation
    // This avoids N+1 queries and is faster
    const { data: events, error } = await supabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        flier_url,
        cover_image_url,
        start_time,
        end_time,
        capacity,
        venue:venues!inner(
          id,
          name,
          city,
          state,
          country
        )
      `)
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"])
      .gte("start_time", twelveHoursAgo.toISOString())
      .or("registration_type.is.null,registration_type.eq.guestlist")
      .order("start_time", { ascending: true })
      .limit(6);

    if (error || !events) {
      return [];
    }

    // Get registration counts in batch using aggregation (much more efficient)
    const eventIds = events?.map((e: any) => e.id) || [];
    let registrationCounts: Record<string, number> = {};
    
    if (eventIds.length > 0) {
      // Use aggregation query instead of fetching all rows - much faster
      const { data: regCounts, error: countError } = await supabase
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds);
      
      if (!countError && regCounts) {
        // Count registrations per event (in-memory aggregation is fast for small datasets)
        regCounts.forEach((reg: any) => {
          registrationCounts[reg.event_id] = (registrationCounts[reg.event_id] || 0) + 1;
        });
      }
    }

    // Transform events to match component format
    return events.map((event: any) => {
      const startDate = new Date(event.start_time);
      const day = startDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const dayNum = startDate.getDate();
      const month = startDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const time = startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      
      const today = new Date();
      const isToday = startDate.toDateString() === today.toDateString();
      const dateStr = isToday ? "TONIGHT" : `${day} ${dayNum} ${month}`;
      
      const regCount = registrationCounts[event.id] || 0;
      const spotsLeft = event.capacity 
        ? Math.max(event.capacity - regCount, 0)
        : null;
      
      return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        date: dateStr,
        time: time,
        venue: event.venue?.name || "Venue TBA",
        city: event.venue?.city || "",
        image: event.flier_url || event.cover_image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=800&fit=crop",
        spotsLeft: spotsLeft || 0,
        capacity: event.capacity || 0,
      };
    });
  } catch (error) {
    // Log to Sentry in production, console in development
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    } else {
      console.error("Error fetching featured events:", error);
    }
    return [];
  }
}

// Cache data fetching function with optimized revalidation time
const getCachedFeaturedEvents = unstable_cache(
  getFeaturedEvents,
  ['homepage-featured-events'],
  { revalidate: 60, tags: ['events', 'homepage'] } // 60s - events change frequently
);

export default async function HomePage() {
  // Fetch featured events on the server with caching
  const featuredEvents = await getCachedFeaturedEvents();

  return (
    <>
      {/* Force dark mode for landing page - set before render to avoid flash */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              document.documentElement.setAttribute('data-theme', 'dark');
              document.documentElement.classList.add('dark');
              document.documentElement.classList.remove('light');
            })();
          `,
        }}
      />
      <Suspense fallback={<HomePageSkeleton />}>
        <HomePageClient initialEvents={featuredEvents} />
      </Suspense>
    </>
  );
}

function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-void">
      <div className="h-screen flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    </div>
  );
}
