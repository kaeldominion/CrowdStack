"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, ConfirmModal, InlineSpinner } from "@crowdstack/ui";
import { QrCode, Check, X, Ticket, ExternalLink, Eye } from "lucide-react";
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
    /** Event capacity */
    capacity?: number | null;
    /** Number of registrations */
    registration_count?: number;
    /** Registration type: guestlist, display_only, or external_link */
    registration_type?: "guestlist" | "display_only" | "external_link";
    /** External ticket URL for external_link type */
    external_ticket_url?: string | null;
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
  /** Guestlist is closed (full or registration ended) */
  isGuestlistClosed?: boolean;
  /** Show as past event */
  isPast?: boolean;
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
  isGuestlistClosed = false,
  isPast = false,
  className = "",
}: AttendeeEventCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const userId = useReferralUserId();

  const heroImage = event.flier_url || event.cover_image_url;
  const hasCheckedIn = registration?.checkins && registration.checkins.length > 0;
  const isLive = variant === "live";
  const registrationCount = event.registration_count || 0;
  const capacity = event.capacity || 0;
  const spotsLeft = capacity > 0 ? Math.max(capacity - registrationCount, 0) : null;

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

  // Open cancel confirmation modal
  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCancelModal(true);
  };

  // Handle actual cancel registration
  const handleConfirmCancel = async () => {
    if (!registration?.id) return;
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/registrations/${registration.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setShowCancelModal(false);
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
    if (isPast) {
      return { text: "ENDED", color: "slate" as const, showDot: false };
    }
    if (isAttending || registration) {
      return { text: "ATTENDING", color: "green" as const, showDot: false };
    }
    if (isGuestlistClosed) {
      return { text: "CLOSED", color: "amber" as const, showDot: false };
    }
    // Show registration type badges
    if (event.registration_type === "display_only") {
      return { text: "INFO", color: "slate" as const, showDot: false, icon: Eye };
    }
    if (event.registration_type === "external_link") {
      return { text: "EXTERNAL", color: "blue" as const, showDot: false, icon: ExternalLink };
    }
    if (badgeText) {
      return { text: badgeText.toUpperCase(), color: "purple" as const, showDot: false };
    }
    return null;
  };

  const badgeConfig = getBadgeConfig();

  // Wrap with glow effect for live events
  if (isLive) {
    return (
      <div className={`relative ${className}`}>
        {/* Flowing orange/red glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur-sm opacity-40 animate-pulse" />
        <div className="relative">
          <div 
            className="relative rounded-2xl overflow-hidden group border border-accent-error/50 hover:border-accent-error transition-all shadow-soft hover:shadow-lg bg-void"
          >
            <Link href={`/e/${event.slug}`} className="block">
              {/* Full-bleed background image */}
              <div className="relative aspect-[3/4] min-h-[320px]">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={event.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-error/40 via-accent-warning/30 to-void flex items-center justify-center">
                    <Ticket className="h-16 w-16 text-muted" />
                  </div>
                )}
                
                {/* Gradient overlay - stronger fade to black at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/95 to-transparent" />
                
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
                        url={`${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`}
                        imageUrl={event.flier_url || event.cover_image_url || undefined}
                        compact
                        iconOnly
                        userId={userId || undefined}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {/* Event name */}
                  <h3 className="font-sans text-xl font-black text-primary uppercase tracking-tight leading-tight line-clamp-2">
                    {event.name}
                  </h3>
                  
                  {/* Venue info */}
                  {event.venue?.name && (
                    <p className="text-sm text-secondary mt-1">
                      {event.venue.name}
                      {event.venue.city && <span> · {event.venue.city}</span>}
                    </p>
                  )}

                  {/* Date & Time */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-secondary">
                    <span className="font-mono font-medium text-primary">
                      {formatEventDate(event.start_time)}
                    </span>
                    <span className="font-mono">{formatEventTime(event.start_time)}</span>
                  </div>

                  {/* Capacity for live events */}
                  {capacityPercent !== undefined && (
                    <p className="text-sm text-secondary mt-2">
                      {capacityPercent}% Capacity
                    </p>
                  )}

                  {/* Action buttons for registered attendees */}
                  {registration && isAttending && (
                    <div className="flex items-center justify-between mt-4">
                      {showVip && (
                        <Badge color="green" variant="solid" className="!rounded-md !px-2 !py-1 !text-[10px]">
                          VIP
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={handleViewEntry}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-primary/90 hover:bg-accent-primary text-white text-xs font-semibold transition-colors"
                        >
                          {loading ? (
                            <InlineSpinner size="sm" />
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              Entry
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleViewEntry}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-glass hover:bg-active text-primary text-xs font-semibold transition-colors"
                        >
                          <QrCode className="h-3 w-3" />
                          QR
                        </button>
                        <button
                          onClick={handleCancelClick}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-glass hover:bg-active text-secondary hover:text-accent-error text-xs transition-colors"
                          title="Cancel registration"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Cancel Registration Confirmation Modal */}
        <ConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
          title="Cancel Registration"
          message={`Are you sure you want to cancel your registration for ${event.name}? You can always register again later.`}
          variant="danger"
          confirmText="Cancel Registration"
          cancelText="Keep Registration"
          loading={cancelling}
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden group border border-border-subtle hover:border-accent-primary/50 transition-all shadow-soft hover:shadow-lg ${className}`}
    >
      <Link href={`/e/${event.slug}`} className="block">
        {/* Full-bleed background image */}
        <div className="relative aspect-[3/4] min-h-[320px]">
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
          
          {/* Gradient overlay - stronger fade to black at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/95 to-transparent" />
          
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
            <h3 className="font-sans text-xl font-black text-primary uppercase tracking-tight leading-tight line-clamp-2">
              {event.name}
            </h3>
            
            {/* Venue Name */}
            {event.venue?.name && (
              <p className="text-xs text-secondary">
                @ {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}
              </p>
            )}
            
            {/* Registration count & spots left */}
            {capacity > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-secondary">
                  {registrationCount} registered
                </span>
                <span className="text-muted">•</span>
                <span className={`font-medium ${
                  spotsLeft !== null && spotsLeft <= 10 
                    ? "text-accent-warning" 
                    : "text-accent-success"
                }`}>
                  {spotsLeft !== null && spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
                </span>
              </div>
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
                    onClick={handleCancelClick}
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
              ) : isPast ? (
                <span className="flex-1 text-center bg-raised text-secondary font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md">
                  Event Ended
                </span>
              ) : isGuestlistClosed ? (
                <span className="flex-1 text-center bg-raised text-secondary font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md cursor-not-allowed">
                  Guestlist Closed
                </span>
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

      {/* Cancel Registration Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Registration"
        message={`Are you sure you want to cancel your registration for ${event.name}? You can always register again later.`}
        variant="danger"
        confirmText="Cancel Registration"
        cancelText="Keep Registration"
        loading={cancelling}
      />
    </div>
  );
}

