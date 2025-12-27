"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@crowdstack/ui";
import { QrCode, Check, X, Ticket } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { useReferralUserId } from "@/components/ReferralTracker";

interface AttendeeEventCardProps {
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
  };
  registration?: {
    id: string;
    checkins?: { checked_in_at: string }[];
  };
  /** Card display variant */
  variant?: "default" | "attending" | "live";
  /** Show share button */
  showShare?: boolean;
  /** Custom badge text (e.g., venue type) */
  badgeText?: string;
  /** Is user registered/attending */
  isAttending?: boolean;
  /** Show VIP badge */
  showVip?: boolean;
  /** Show capacity percentage for live events */
  capacityPercent?: number;
  /** Callback when registration is cancelled */
  onCancelRegistration?: (registrationId: string) => void;
  className?: string;
}

export function AttendeeEventCard({
  event,
  registration,
  variant = "default",
  showShare = true,
  badgeText,
  isAttending = false,
  showVip = false,
  capacityPercent,
  onCancelRegistration,
  className = "",
}: AttendeeEventCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const userId = useReferralUserId();

  const heroImage = event.flier_url || event.cover_image_url;
  const hasCheckedIn = registration?.checkins && registration.checkins.length > 0;
  const isLive = variant === "live";

  // Format date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "TODAY";
    if (diffDays === 1) return "TOMORROW";
    
    // Format as "SAT 28 OCT"
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

  // Handle cancel registration
  const handleCancelRegistration = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!registration?.id) return;
    
    // Confirm before cancelling
    if (!confirm(`Cancel your registration for ${event.name}?`)) return;
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/registrations/${registration.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Notify parent component to refresh
        onCancelRegistration?.(registration.id);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to cancel registration");
      }
    } catch (error) {
      console.error("Error cancelling registration:", error);
      alert("Failed to cancel registration");
    } finally {
      setCancelling(false);
    }
  };

  // Build share URL
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/e/${event.slug}` 
    : `/e/${event.slug}`;

  // Get badge config
  const getBadgeConfig = () => {
    if (isLive) {
      return { text: "LIVE", color: "green" as const, showDot: true };
    }
    if (isAttending || registration) {
      return { text: "ATTENDING", color: "green" as const, showDot: false };
    }
    if (badgeText) {
      return { text: badgeText.toUpperCase(), color: "purple" as const, showDot: false };
    }
    return null;
  };

  const badgeConfig = getBadgeConfig();

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden group border border-border-subtle hover:border-accent-primary/50 transition-all shadow-soft hover:shadow-lg ${className}`}
    >
      <Link href={`/e/${event.slug}`} className="block">
        {/* Full-bleed background image */}
        <div className="relative aspect-[3/4] min-h-[380px]">
          {heroImage ? (
            <img
              src={heroImage}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/40 via-accent-secondary/30 to-void flex items-center justify-center">
              <Ticket className="h-16 w-16 text-muted" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
          
          {/* Top badges */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
            {badgeConfig && (
              <Badge 
                color={badgeConfig.color} 
                variant="solid" 
                className="!rounded-md !px-3 !py-1.5 !text-xs !font-bold"
              >
                {badgeConfig.showDot && (
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                )}
                {badgeConfig.text}
              </Badge>
            )}
            
            {showShare && (
              <div 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <ShareButton
                  title={event.name}
                  text={`Check out ${event.name}${event.venue?.name ? ` at ${event.venue.name}` : ""}`}
                  url={shareUrl}
                  imageUrl={event.flier_url || event.cover_image_url || undefined}
                  userId={userId || undefined}
                  iconOnly
                />
              </div>
            )}
          </div>
          
          {/* Content overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            {/* Date & Time */}
            <p className="font-mono text-sm font-medium text-accent-secondary tracking-wide">
              {formatEventDate(event.start_time)} • {formatEventTime(event.start_time)}
            </p>
            
            {/* Event Name */}
            <h3 className="font-sans text-2xl font-black text-primary uppercase tracking-tight leading-tight">
              {event.name}
            </h3>
            
            {/* Venue Name */}
            {event.venue?.name && (
              <p className="text-xs text-secondary">
                @ {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}
              </p>
            )}
            
            {/* Capacity for live events */}
            {isLive && capacityPercent !== undefined && (
              <p className="text-sm text-secondary">
                {capacityPercent}% Cap
              </p>
            )}
            
            {/* Info row - only show if there's something to display */}
            {!isLive && (showVip || (!isAttending && !registration)) && (
              <div className="flex items-center justify-between">
                {showVip && (
                  <Badge color="green" variant="solid" className="!rounded-md !px-2 !py-1 !text-[10px]">
                    VIP
                  </Badge>
                )}
                
                {!isAttending && !registration && (
                  <span className="text-xs text-secondary">
                    <span className="font-semibold text-primary">Free</span> w/ RSVP
                  </span>
                )}
              </div>
            )}
            
            {/* Action buttons - compact */}
            <div className="flex gap-2">
              {registration ? (
                <>
                  <button
                    onClick={handleViewEntry}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-accent-success text-void font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-accent-success/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    View Entry
                  </button>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-accent-error/20 border border-accent-error/40 hover:bg-accent-error/30 transition-colors disabled:opacity-50"
                    onClick={handleCancelRegistration}
                    disabled={cancelling}
                    title="Cancel registration"
                  >
                    <X className="h-3.5 w-3.5 text-accent-error" />
                  </button>
                </>
              ) : isLive ? (
                <>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 bg-accent-success text-void font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-accent-success/90 transition-colors"
                  >
                    <QrCode className="h-3 w-3" />
                    Show QR
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center bg-transparent text-primary font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md border border-border-strong hover:bg-glass/50 transition-colors"
                  >
                    Status
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/e/${event.slug}/register`);
                  }}
                  className="flex-1 bg-white text-void font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-white/90 transition-colors"
                >
                  Join Guestlist
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

