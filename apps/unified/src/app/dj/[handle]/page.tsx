import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { DJProfilePageContent } from "./DJProfilePageContent";

// Force dynamic rendering to prevent caching stale DJ data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { handle: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServiceRoleClient();
  const { data: dj } = await supabase
    .from("djs")
    .select("name, bio, profile_image_url, handle")
    .eq("handle", params.handle)
    .single();

  if (!dj) {
    return {
      title: "DJ Not Found",
    };
  }

  const title = `${dj.name} | DJ Profile`;
  const description = dj.bio || `Check out ${dj.name}'s mixes and upcoming events`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: dj.profile_image_url ? [dj.profile_image_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: dj.profile_image_url ? [dj.profile_image_url] : [],
    },
  };
}

export default async function DJProfilePage({ params }: PageProps) {
  const supabase = createServiceRoleClient();

  // Fetch DJ profile with related data
  const { data: djData, error } = await supabase
    .from("djs")
    .select("*")
    .eq("handle", params.handle)
    .single();

  if (error || !djData) {
    notFound();
  }

  // Fetch published mixes (featured first, then by display order)
  const { data: mixes } = await supabase
    .from("mixes")
    .select("*")
    .eq("dj_id", djData.id)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false });

  // Get follower count
  const { data: follows } = await supabase
    .from("dj_follows")
    .select("id")
    .eq("dj_id", djData.id);

  const followerCount = follows?.length || 0;

  // Get upcoming events (where DJ is on lineup)
  const { data: upcomingLineups } = await supabase
    .from("event_lineups")
    .select(`
      display_order,
      set_time,
      events!inner(
        id,
        slug,
        name,
        start_time,
        end_time,
        cover_image_url,
        flier_url,
        venue_id,
        venues(name, city)
      )
    `)
    .eq("dj_id", djData.id)
    .order("display_order", { ascending: true });

  const now = new Date();
  
  // Helper to determine if event has ended
  // Events without end_time are considered ended 24 hours after start
  const hasEventEnded = (startTime: Date, endTime: Date | null): boolean => {
    if (endTime) {
      return endTime < now;
    }
    // No end time - consider ended 24 hours after start
    const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return startTime < hoursAgo24;
  };

  // Upcoming & Live events (not ended yet)
  const upcomingEvents = upcomingLineups
    ?.filter((lineup: any) => {
      const event = lineup.events;
      if (!event) return false;
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;
      // Include if event hasn't ended yet (upcoming OR currently live)
      return !hasEventEnded(startTime, endTime);
    })
    .map((lineup: any) => {
      const startTime = new Date(lineup.events.start_time);
      const endTime = lineup.events.end_time ? new Date(lineup.events.end_time) : null;
      const isLive = startTime <= now && !hasEventEnded(startTime, endTime);
      return {
        id: lineup.events.id,
        slug: lineup.events.slug,
        name: lineup.events.name,
        start_time: lineup.events.start_time,
        end_time: lineup.events.end_time,
        flier_url: lineup.events.flier_url,
        venues: lineup.events.venues,
        display_order: lineup.display_order,
        set_time: lineup.set_time,
        isLive,
      };
    })
    // Sort: live events first, then by start time
    .sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    }) || [];

  const pastEvents = upcomingLineups
    ?.filter((lineup: any) => {
      const event = lineup.events;
      if (!event) return false;
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;
      // Past if event has ended
      return hasEventEnded(startTime, endTime);
    })
    .map((lineup: any) => ({
      id: lineup.events.id,
      slug: lineup.events.slug,
      name: lineup.events.name,
      start_time: lineup.events.start_time,
      flier_url: lineup.events.flier_url,
    })) || [];

  // Get gallery images
  const { data: gallery } = await supabase
    .from("dj_gallery")
    .select("*")
    .eq("dj_id", djData.id)
    .order("is_hero", { ascending: false })
    .order("display_order", { ascending: true });

  // Get videos
  const { data: videos } = await supabase
    .from("dj_videos")
    .select("*")
    .eq("dj_id", djData.id)
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Helper to construct image URLs from storage paths
  function getImageUrl(storagePath: string | null | undefined): string | null {
    if (!storagePath) return null;
    
    // Already a full URL
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      return storagePath;
    }
    
    // Data URL (base64)
    if (storagePath.startsWith("data:")) {
      return storagePath;
    }
    
    // Storage path - construct full URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
    
    if (projectRef) {
      return `https://${projectRef}.supabase.co/storage/v1/object/public/dj-images/${storagePath}`;
    }
    
    return storagePath;
  }

  // Get hero image (priority: cover_image_url > gallery hero image > first gallery image)
  const heroImageFromGallery = gallery?.find((g) => g.is_hero)?.storage_path;
  const firstGalleryImage = gallery?.[0]?.storage_path;
  const heroImage = getImageUrl(djData.cover_image_url) || getImageUrl(heroImageFromGallery) || getImageUrl(firstGalleryImage);

  // Map gallery images with full URLs
  const galleryWithUrls = (gallery || []).map((img) => ({
    ...img,
    imageUrl: getImageUrl(img.storage_path),
  }));

  return (
    <DJProfilePageContent
      dj={djData}
      mixes={mixes || []}
      followerCount={followerCount}
      upcomingEvents={upcomingEvents}
      pastEvents={pastEvents}
      gallery={galleryWithUrls}
      videos={videos || []}
      heroImage={heroImage}
    />
  );
}

