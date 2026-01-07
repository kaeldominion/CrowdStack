import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { HomePageClient } from "./HomePageClient";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

// ISR: Revalidate homepage every 60 seconds
export const revalidate = 60;

async function getFeaturedEvents() {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

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
        venue:venues(
          id,
          name,
          city,
          state,
          country
        ),
        registrations(count)
      `, { count: 'exact' })
      .eq("status", "published")
      .in("venue_approval_status", ["approved", "not_required"])
      .gte("start_time", twelveHoursAgo.toISOString())
      .or("registration_type.is.null,registration_type.eq.guestlist")
      .order("start_time", { ascending: true })
      .limit(6);

    if (error || !events) {
      return [];
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
      
      const spotsLeft = event.capacity && event.registrations?.[0]?.count 
        ? Math.max(event.capacity - event.registrations[0].count, 0)
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
    console.error("Error fetching featured events:", error);
    return [];
  }
}

async function getPopularVenues() {
  try {
    const supabase = createServiceRoleClient();

    const { data: venues, error } = await supabase
      .from("venues")
      .select(`
        id,
        name,
        slug,
        city,
        country,
        cover_image_url,
        logo_url,
        venue_tags(tag_type, tag_value)
      `)
      .order("name", { ascending: true })
      .limit(4);

    if (error || !venues) {
      return [];
    }

    // Transform venues to match component format
    return venues.map((venue: any) => {
      const musicTags = venue.venue_tags?.filter((t: any) => t.tag_type === "music") || [];
      return {
        id: venue.id,
        name: venue.name,
        slug: venue.slug || venue.id,
        city: venue.city || "",
        country: venue.country || "",
        image: venue.cover_image_url || venue.logo_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop",
        tags: musicTags.map((t: { tag_type: string; tag_value: string }) => t.tag_value) || [],
      };
    });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return [];
  }
}

// Cache data fetching functions with 60 second revalidation
const getCachedFeaturedEvents = unstable_cache(
  getFeaturedEvents,
  ['homepage-featured-events'],
  { revalidate: 60, tags: ['events', 'homepage'] }
);

const getCachedPopularVenues = unstable_cache(
  getPopularVenues,
  ['homepage-popular-venues'],
  { revalidate: 60, tags: ['venues', 'homepage'] }
);

export default async function HomePage() {
  // Fetch data in parallel on the server with caching
  const [featuredEvents, popularVenues] = await Promise.all([
    getCachedFeaturedEvents(),
    getCachedPopularVenues(),
  ]);

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageClient 
        initialEvents={featuredEvents}
        initialVenues={popularVenues}
      />
    </Suspense>
  );
}

function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-void">
      <div className="h-screen flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    </div>
  );
}
