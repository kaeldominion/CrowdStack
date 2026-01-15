"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Badge, LoadingSpinner, Button, InlineSpinner } from "@crowdstack/ui";
import {
  Calendar,
  Instagram,
  Share2,
  CheckCircle2,
  PartyPopper,
  MessageCircle,
  Camera,
  Pencil,
} from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";
import { EventCardRow } from "@/components/EventCardRow";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  flier_url: string | null;
  max_guestlist_size: number | null;
  registration_count: number;
  has_guestlist?: boolean;
  ticket_sale_mode?: "none" | "external" | "internal";
  external_ticket_url?: string | null;
  venue: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  organizer: {
    id: string;
    name: string;
  } | null;
}

interface PastEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  flier_url: string | null;
  venue: {
    name: string;
    city: string | null;
  } | null;
}

interface Promoter {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  whatsapp_number: string | null;
}

interface Stats {
  total_events_promoted: number;
  total_checkins: number;
}

interface PromoterProfileClientProps {
  slug: string;
  promoterId: string;
  initialData?: {
    promoter: Promoter;
    upcoming_events: Event[];
    past_events: PastEvent[];
    stats: Stats;
  };
  cacheBuster?: number;
}

export function PromoterProfileClient({ slug, promoterId, initialData, cacheBuster }: PromoterProfileClientProps) {
  const [promoter, setPromoter] = useState<Promoter | null>(initialData?.promoter || null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>(initialData?.upcoming_events || []);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>(initialData?.past_events || []);
  const [stats, setStats] = useState<Stats | null>(initialData?.stats || null);
  const [loading, setLoading] = useState(!initialData);
  const [copied, setCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Always check ownership (even with initialData)
    const checkOwnership = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: userPromoter } = await supabase
            .from("promoters")
            .select("id")
            .eq("created_by", user.id)
            .single();

          if (userPromoter && userPromoter.id === promoterId) {
            setIsOwner(true);
          }
        }
      } catch (error) {
        console.error("Failed to check ownership:", error);
      }
    };

    // If we have initial data from server, use it immediately
    if (initialData) {
      setPromoter(initialData.promoter);
      setUpcomingEvents(initialData.upcoming_events);
      setPastEvents(initialData.past_events);
      setStats(initialData.stats);
      setLoading(false);
      checkOwnership();
      return;
    }

    // Fallback: Load from API if no initial data (shouldn't happen with our fix)
    const loadProfile = async () => {
      try {
        await checkOwnership();

        // Load profile data with aggressive cache-busting
        const timestamp = cacheBuster || new Date().getTime();
        const response = await fetch(`/api/promoters/by-slug/${slug}?t=${timestamp}&_cb=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setPromoter(data.promoter);
          setUpcomingEvents(data.upcoming_events);
          setPastEvents(data.past_events);
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load promoter profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [slug, promoterId, initialData, cacheBuster]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 5MB");
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/promoter/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      // Update local state with new avatar URL
      if (promoter) {
        setPromoter({ ...promoter, profile_image_url: data.avatar_url });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: promoter?.name || "Check out this promoter",
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner text="Loading profile..." />
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <Card className="text-center p-8">
          <h1 className="text-xl font-bold text-primary mb-2">Profile Not Found</h1>
          <p className="text-secondary">This promoter profile doesn't exist or is private.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="bg-gradient-to-b from-accent-primary/10 to-transparent pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-24">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            {/* Avatar with inline edit */}
            <div className="relative group">
              {promoter.profile_image_url ? (
                <Image
                  src={promoter.profile_image_url}
                  alt={promoter.name}
                  width={120}
                  height={120}
                  className="rounded-full border-2 border-subtle object-cover w-[120px] h-[120px]"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full bg-accent-primary flex items-center justify-center text-4xl font-black text-void">
                  {promoter.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Upload overlay - only show for owner */}
              {isOwner && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <InlineSpinner size="lg" className="text-white" />
                    ) : (
                      <div className="flex flex-col items-center text-white">
                        <Camera className="h-6 w-6 mb-1" />
                        <span className="text-xs font-medium">Change</span>
                      </div>
                    )}
                  </button>
                </>
              )}

              {/* Edit badge for owner */}
              {isOwner && !uploadingAvatar && (
                <div className="absolute -bottom-1 -right-1 bg-accent-primary rounded-full p-1.5 glow-primary">
                  <Pencil className="h-3 w-3 text-void" />
                </div>
              )}
            </div>

            {/* Avatar error message */}
            {avatarError && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-accent-error/90 text-primary text-xs px-3 py-1 rounded-lg whitespace-nowrap">
                {avatarError}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="page-title">{promoter.name}</h1>
                <Badge variant="secondary" className="!bg-accent-primary/20 !text-accent-primary text-xs">
                  Promoter
                </Badge>
                {isOwner && (
                  <Link href="/app/promoter/profile">
                    <Badge variant="secondary" className="!bg-glass !border !border-subtle hover:!border-accent-primary cursor-pointer">
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Badge>
                  </Link>
                )}
              </div>

              {promoter.bio && (
                <p className="text-secondary mb-4 max-w-lg">{promoter.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
                <div className="stat-chip">
                  <span className="stat-chip-value">{stats?.total_events_promoted || 0}</span>
                  <span className="stat-chip-label">Events</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-value">{stats?.total_checkins || 0}</span>
                  <span className="stat-chip-label">Guests</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {promoter.instagram_handle && (
                  <a
                    href={`https://instagram.com/${promoter.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="filter-toggle filter-toggle-inactive"
                  >
                    <Instagram className="h-4 w-4" />
                    @{promoter.instagram_handle}
                  </a>
                )}
                {promoter.whatsapp_number && (
                  <a
                    href={`https://wa.me/${promoter.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="filter-toggle filter-toggle-inactive !text-accent-success hover:!bg-accent-success/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                <Button variant="secondary" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* Upcoming Events */}
        <section className="mb-12">
          <h2 className="section-header flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-primary" />
            Upcoming Events
          </h2>

          {upcomingEvents.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <PartyPopper className="h-10 w-10 text-muted mx-auto mb-3" />
              <p className="text-secondary">No upcoming events right now.</p>
              <p className="text-sm text-muted mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCardRow
                  key={event.id}
                  event={{
                    ...event,
                    has_guestlist: event.has_guestlist,
                    ticket_sale_mode: event.ticket_sale_mode ?? "none",
                    external_ticket_url: event.external_ticket_url,
                  }}
                  linkParams={`ref=${promoterId}`}
                  shareRef={promoterId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="section-header flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent-success" />
              Recent Events
            </h2>

            <div className="space-y-2">
              {pastEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-glass/50 border border-subtle/50"
                >
                  {/* Small icon or thumbnail */}
                  {event.flier_url ? (
                    <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={event.flier_url}
                        alt={event.name}
                        fill
                        className="object-cover opacity-70"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-raised flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-muted" />
                    </div>
                  )}

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-primary line-clamp-1">{event.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{formatDate(event.start_time)}</span>
                      {event.venue && (
                        <>
                          <span>•</span>
                          <span className="line-clamp-1">{event.venue.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
