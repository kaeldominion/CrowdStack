"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@crowdstack/ui";
import { QrCode, MapPin, MoreHorizontal, Ticket, ExternalLink, Eye } from "lucide-react";
import { usePrefetch } from "@/lib/hooks/use-prefetch";

interface EventCardCompactProps {
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    flier_url?: string | null;
    cover_image_url?: string | null;
    venue?: {
      name: string;
      city?: string | null;
    } | null;
    /** Event max guestlist size */
    max_guestlist_size?: number | null;
    /** Number of registrations */
    registration_count?: number;
    /** Registration type: guestlist, display_only, or external_link - Deprecated, kept for backward compatibility */
    registration_type?: "guestlist" | "display_only" | "external_link";
    /** Enable guestlist registration */
    has_guestlist?: boolean;
    /** Ticket sale mode: none, external, or internal */
    ticket_sale_mode?: "none" | "external" | "internal";
    /** Public event visibility */
    is_public?: boolean;
    /** External ticket URL for external_link type */
    external_ticket_url?: string | null;
  };
  registration?: {
    id: string;
    checkins?: { checked_in_at: string }[];
  };
  /** Show VIP badge */
  showVip?: boolean;
  /** Custom badge text */
  badgeText?: string;
  /** Optional onMore handler for the ... button */
  onMore?: () => void;
  /** Guestlist is closed (full or registration ended) */
  isGuestlistClosed?: boolean;
  /** Show as past event */
  isPast?: boolean;
  className?: string;
}

/**
 * Compact horizontal event card for lists and grids
 * Design system component - uses tokens and primitives
 */
export function EventCardCompact({
  event,
  registration,
  showVip = false,
  badgeText,
  onMore,
  isGuestlistClosed = false,
  isPast = false,
  className = "",
}: EventCardCompactProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { prefetchEvent } = usePrefetch();

  const heroImage = event.flier_url || event.cover_image_url;
  const registrationCount = event.registration_count || 0;
  const maxGuestlistSize = event.max_guestlist_size || 0;
  const spotsLeft = maxGuestlistSize > 0 ? Math.max(maxGuestlistSize - registrationCount, 0) : null;

  // Format date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Compare dates at day level (ignore time)
    const eventDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((eventDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "TODAY";
    if (diffDays === 1) return "TOMORROW";
    
    const day = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    return `${day} ${dayNum} ${month}`;
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // Handle QR pass click
  const handleViewEntry = async (e: React.MouseEvent) => {
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

  // Handle more button click
  const handleMore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMore?.();
  };

  return (
    <Link 
      href={`/e/${event.slug}`}
      className={`block group ${className}`}
      onMouseEnter={() => prefetchEvent(event.slug)}
    >
      <div className="flex gap-4 p-4 rounded-2xl bg-glass border border-border-subtle hover:border-accent-primary/30 transition-all hover:shadow-soft">
        {/* Flier Image - 9:16 aspect ratio */}
        <div className="relative w-20 sm:w-24 aspect-[9/16] flex-shrink-0 rounded-xl overflow-hidden">
          {heroImage ? (
            <img
              src={heroImage}
              alt={event.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-primary/40 via-accent-secondary/30 to-void flex items-center justify-center">
              <Ticket className="h-6 w-6 text-muted" />
            </div>
          )}
          
          {/* Badge on image */}
          {(showVip || badgeText) && (
            <div className="absolute top-1.5 left-1.5">
              <Badge 
                color="purple" 
                variant="solid" 
                className="!rounded-md !px-1.5 !py-0.5 !text-[9px] !font-bold"
              >
                {showVip ? "VIP" : badgeText}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          {/* Top: Date & Time */}
          <p className="font-mono text-xs font-medium text-accent-secondary tracking-wide">
            {formatEventDate(event.start_time)} • {formatEventTime(event.start_time)}
          </p>
          
          {/* Event Name */}
          <h3 className="font-sans text-xl sm:text-2xl font-black text-primary uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-accent-primary transition-colors">
            {event.name}
          </h3>
          
          {/* Venue */}
          {event.venue?.name && (
            <div className="flex items-center gap-1 text-secondary">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="text-[10px] truncate">{event.venue.name}</span>
            </div>
          )}
          
          {/* Registration count & spots left with progress bar - only for guestlist events */}
          {event.has_guestlist && maxGuestlistSize > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-secondary font-medium">
                  {registrationCount}/{capacity}
                </span>
                <span className={`font-bold ${
                  spotsLeft !== null && spotsLeft <= 10 
                    ? "text-accent-warning" 
                    : "text-accent-success"
                }`}>
                  {spotsLeft !== null && spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
                </span>
              </div>
              {/* Progress bar with purple/blue gradient */}
              <div className="w-full h-1.5 bg-raised rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary"
                  style={{ width: `${Math.min((registrationCount / capacity) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          {/* External ticket indicator */}
          {event.ticket_sale_mode === "external" && event.external_ticket_url && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <ExternalLink className="h-3 w-3" />
              <span className="font-semibold">External Tickets</span>
            </span>
          )}
          
          {/* Display only indicator */}
          {!event.has_guestlist && event.ticket_sale_mode !== "external" && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Eye className="h-3 w-3" />
              <span>Info Only</span>
            </span>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-auto pt-2">
            {registration ? (
              <button
                onClick={handleViewEntry}
                disabled={loading}
                className="flex items-center gap-1.5 bg-accent-success text-void font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-accent-success/90 transition-colors disabled:opacity-50"
              >
                <QrCode className="h-3 w-3" />
                View Entry
              </button>
            ) : isPast ? (
              <span className="bg-raised text-secondary font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md">
                Event Ended
              </span>
            ) : isGuestlistClosed && event.has_guestlist ? (
              <span className="bg-raised text-secondary font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md cursor-not-allowed">
                Guestlist Closed
              </span>
            ) : event.ticket_sale_mode === "external" && event.external_ticket_url ? (
              <a
                href={event.external_ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-blue-600 transition-colors"
              >
                Get Tickets
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : !event.has_guestlist && event.ticket_sale_mode !== "external" ? (
              <span className="flex items-center gap-1.5 bg-raised text-muted font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md">
                <Eye className="h-3 w-3" />
                Info Only
              </span>
            ) : event.has_guestlist ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/e/${event.slug}/register`);
                }}
                className="flex items-center gap-1.5 bg-white text-void font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-white/90 transition-colors"
              >
                Join Guestlist
              </button>
            ) : null}
            
            {onMore && (
              <button
                onClick={handleMore}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-active border border-border-subtle hover:border-border-strong transition-colors"
              >
                <MoreHorizontal className="h-5 w-5 text-secondary" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

