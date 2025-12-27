"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Ticket, MapPin, Check } from "lucide-react";
import { Card, Badge } from "@crowdstack/ui";
import { ShareButton } from "@/components/ShareButton";

interface Attendee {
  id: string;
  name?: string | null;
  profile_picture_url?: string | null;
}

interface EventCardRowProps {
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time?: string | null;
    flier_url?: string | null;
    cover_image_url?: string | null;
    capacity?: number | null;
    registration_count?: number;
    venue?: {
      name: string;
      city?: string | null;
    } | null;
  };
  /** Recent attendees for avatar display */
  recentAttendees?: Attendee[];
  /** User's registration if attending */
  registration?: {
    id: string;
    checkins?: { checked_in_at: string }[];
  };
  /** Show as live event */
  isLive?: boolean;
  /** Show as upcoming (default state) */
  isUpcoming?: boolean;
  /** Show muted style (for past events) */
  isPast?: boolean;
  /** For past events: whether user attended (checked in) */
  didAttend?: boolean;
  className?: string;
}

export function EventCardRow({
  event,
  recentAttendees = [],
  registration,
  isLive = false,
  isUpcoming = true,
  isPast = false,
  didAttend,
  className = "",
}: EventCardRowProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const heroImage = event.flier_url || event.cover_image_url;
  const isAttending = !!registration;
  const spotsLeft = event.capacity ? event.capacity - (event.registration_count || 0) : null;

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    return `${day} ${dayNum} ${month}`;
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const startTime = formatTime(event.start_time);

  // Handle QR pass click
  const handleViewPass = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!registration?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/registrations/${registration.id}/qr-token`);
      if (response.ok) {
        const data = await response.json();
        router.push(`/e/${event.slug}/pass?token=${data.qr_token}`);
      }
    } catch (error) {
      console.error("Error fetching QR token:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <Badge color="green" variant="solid" size="sm" className="!text-[10px] !font-bold">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1.5" />
          LIVE
        </Badge>
      );
    }
    if (isPast) {
      return (
        <Badge color={didAttend ? "green" : "slate"} variant="ghost" size="sm" className="!text-[10px]">
          {didAttend ? "ATTENDED" : "ENDED"}
        </Badge>
      );
    }
    if (isAttending) {
      return (
        <Badge color="green" variant="ghost" size="sm" className="!text-[10px]">
          REGISTERED
        </Badge>
      );
    }
    if (spotsLeft !== null && spotsLeft <= 20) {
      return (
        <Badge color="orange" variant="solid" size="sm" className="!text-[10px] !font-bold">
          {spotsLeft} LEFT
        </Badge>
      );
    }
    return null;
  };

  // Build share URL
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/e/${event.slug}` 
    : `/e/${event.slug}`;

  return (
    <Link href={`/e/${event.slug}`} className={`block group ${className}`}>
      <Card padding="none" hover className="flex gap-2.5 p-2.5">
        {/* Flier Image - 1:1 square aspect ratio */}
        <div className="relative w-16 sm:w-20 aspect-square rounded-lg overflow-hidden bg-glass flex-shrink-0">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={event.name}
              fill
              sizes="(max-width: 640px) 64px, 80px"
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                isPast ? "opacity-60 grayscale-[40%]" : ""
              }`}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-accent-primary/30 to-accent-secondary/30 flex items-center justify-center">
              <Ticket className="h-4 w-4 text-muted" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {/* Top Row: Date + Status */}
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] font-bold text-accent-secondary tracking-wide">
              {formatDate(event.start_time)} • {startTime}
            </p>
            {getStatusBadge()}
          </div>

          {/* Event Name - UPPERCASE */}
          <h3 className={`font-sans text-sm sm:text-base font-black uppercase tracking-tight leading-tight line-clamp-2 transition-colors ${
            isPast ? "text-secondary" : "text-primary group-hover:text-accent-secondary"
          }`}>
            {event.name}
          </h3>

          {/* Venue */}
          {event.venue?.name && (
            <div className="flex items-center gap-1 text-secondary">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="text-[10px] truncate">{event.venue.name}</span>
            </div>
          )}

          {/* Bottom Row: Action Buttons Left + Stats Right */}
          {!isPast && (
            <div className="flex items-center justify-between gap-2 mt-auto pt-1">
              {/* Left: Action Buttons */}
              <div className="flex items-center gap-2">
                {isAttending ? (
                  <button
                    onClick={handleViewPass}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-accent-success text-void font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-md hover:bg-accent-success/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    View Entry
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/e/${event.slug}/register`);
                    }}
                    className="bg-white text-void font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-md hover:bg-white/90 transition-colors"
                  >
                    Join Guestlist
                  </button>
                )}
                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <ShareButton
                    title={event.name}
                    text={`Check out ${event.name}`}
                    url={shareUrl}
                    imageUrl={event.flier_url || event.cover_image_url || undefined}
                    iconOnly
                  />
                </div>
              </div>

              {/* Right: Registration Stats */}
              <div className="flex items-center gap-2 text-right">
                {(event.registration_count || 0) > 0 && (
                  <span className="font-mono text-[10px] text-secondary">
                    <span className="font-bold text-primary">{event.registration_count}</span> registered
                  </span>
                )}
                {spotsLeft !== null && (
                  <span className={`font-mono text-[10px] font-bold ${
                    spotsLeft <= 10 ? "text-accent-warning" : "text-accent-success"
                  }`}>
                    {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Past event stats (no buttons) */}
          {isPast && (event.registration_count || 0) > 0 && (
            <div className="flex items-center justify-end gap-2 mt-auto pt-1">
              <span className="font-mono text-[10px] text-secondary">
                <span className="font-bold text-primary">{event.registration_count}</span> attended
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
