"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Badge, Card, ConfirmModal } from "@crowdstack/ui";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  QrCode, 
  ChevronRight,
  Ticket,
  CheckCircle2,
  X,
  Settings
} from "lucide-react";
import Image from "next/image";
import { ShareButton } from "@/components/ShareButton";
import { PromoterRequestButton } from "@/components/PromoterRequestButton";
import { VenueCard } from "@/components/venue/VenueCard";
import { CalendarButtons } from "@/components/CalendarButtons";
import { PhotoGalleryPreview } from "@/components/PhotoGalleryPreview";
import { useReferralUserId } from "@/components/ReferralTracker";

// Helper to construct Google Maps URL from address
function getGoogleMapsUrl(venue: any): string | null {
  if (venue.google_maps_url) {
    return venue.google_maps_url;
  }
  const addressParts = [venue.address, venue.city, venue.state, venue.country].filter(Boolean);
  if (addressParts.length > 0) {
    const query = encodeURIComponent(addressParts.join(", "));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  return null;
}

// Format date for display
function formatEventDate(date: Date) {
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.getDate().toString(),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

interface EventPageContentProps {
  event: any;
  params: { eventSlug: string };
  shareUrl: string;
  startDate: Date;
  endDate: Date | null;
  isUpcoming: boolean;
  isLive: boolean;
  isMobileFlierView?: boolean;
}

export function EventPageContent({
  event,
  params,
  shareUrl,
  startDate,
  endDate,
  isUpcoming,
  isLive,
  isMobileFlierView = false,
}: EventPageContentProps) {
  const userId = useReferralUserId();
  const searchParams = useSearchParams();
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [canEditEvent, setCanEditEvent] = useState(false);
  const [manageRole, setManageRole] = useState<"admin" | "organizer" | "venue" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const dateInfo = formatEventDate(startDate);
  const spotsLeft = event.capacity ? event.capacity - (event.registration_count || 0) : null;
  const isPast = !isUpcoming && !isLive;
  
  // Check if user is already registered
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const res = await fetch(`/api/events/by-slug/${params.eventSlug}/check-registration`);
        const data = await res.json();
        if (data.registered) {
          setIsRegistered(true);
          setRegistrationId(data.registration_id || null);
        }
      } catch (error) {
        // Silently fail
      }
    };
    checkRegistration();
  }, [params.eventSlug]);
  
  // Handle cancel registration
  const handleConfirmCancel = async () => {
    if (!registrationId) return;
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setShowCancelModal(false);
        setIsRegistered(false);
        setRegistrationId(null);
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
  
  // Check if user can manage this event
  useEffect(() => {
    const checkEditPermission = async () => {
      try {
        const res = await fetch(`/api/events/${event.id}/can-edit`);
        if (res.ok) {
          const data = await res.json();
          setCanEditEvent(data.canEdit === true);
          setManageRole(data.role || null);
        }
      } catch (error) {
        // Silently fail - user can't edit
      }
    };
    checkEditPermission();
  }, [event.id]);

  // Get the correct manage URL based on user's role
  const getManageUrl = () => {
    if (manageRole === "admin") {
      return `/admin/events/${event.id}`;
    } else if (manageRole === "venue") {
      return `/app/venue/events/${event.id}`;
    } else {
      return `/app/organizer/events/${event.id}`;
    }
  };
  
  const getRegisterUrl = () => {
    const ref = searchParams?.get("ref");
    const baseUrl = `/e/${params.eventSlug}/register`;
    if (ref) {
      return `${baseUrl}?ref=${encodeURIComponent(ref)}`;
    }
    return baseUrl;
  };
  
  const getPassUrl = () => `/e/${params.eventSlug}/pass`;

  // ===========================================
  // MOBILE CONTENT (shown in MobileScrollExperience)
  // ===========================================
  if (isMobileFlierView) {
  return (
      <div className="bg-[var(--bg-void)]/95 rounded-t-3xl">
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-3">
          <div className="w-12 h-1 bg-[var(--border-strong)] rounded-full" />
                    </div>
        
        {/* Main content area */}
        <div className="px-5 pb-12 space-y-5">
          
          {/* Attendees + Progress Section - Single Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Avatars + Going */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {(event.registration_count || 0) > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {(event.recent_attendees || []).slice(0, 4).map((attendee: any, i: number) => (
                      attendee?.profile_picture_url ? (
                      <Image
                          key={attendee.id || i}
                          src={attendee.profile_picture_url}
                          alt={attendee.name || "Attendee"}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full border-2 border-[var(--bg-void)] object-cover"
                        />
                      ) : (
                        <div 
                          key={attendee?.id || i}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent-primary)] border-2 border-[var(--bg-void)] flex items-center justify-center"
                        >
                          <span className="text-xs font-bold text-[var(--text-inverse)]">
                            {attendee?.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )
                    ))}
                    {(event.registration_count || 0) > 4 && (
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-raised)] border-2 border-[var(--bg-void)] flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          +{((event.registration_count || 0) - 4).toLocaleString()}
                        </span>
                    </div>
                  )}
                </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                    {event.registration_count} Going
                  </span>
                </>
              ) : (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary">
                  Be first to register for XP ✨
                </span>
              )}
        </div>
            
            {/* Right: Spots Left + Progress Bar */}
            {event.capacity && spotsLeft !== null && (
              <div className="flex-1 max-w-32">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary text-right mb-1">
                  {spotsLeft} Left
                </p>
                <div className="w-full h-2 bg-raised rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(((event.registration_count || 0) / event.capacity) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
                )}
              </div>
          
          {/* CTA Button Row */}
          <div className="flex items-center gap-3">
            {isPast ? (
              <Button 
                variant="secondary"
                size="lg"
                disabled
                className="flex-1 font-mono uppercase tracking-wider opacity-60 cursor-not-allowed"
              >
                <Ticket className="h-4 w-4 mr-2" />
                Guestlist Closed
              </Button>
            ) : (
              <>
                <Link href={isRegistered ? getPassUrl() : getRegisterUrl()} className="flex-1">
                  <Button 
                    variant={isRegistered ? "secondary" : "primary"}
                    size="lg"
                    className={`w-full font-mono uppercase tracking-wider ${
                      isRegistered 
                        ? "bg-accent-success/20 border-accent-success/50 text-accent-success hover:bg-accent-success/30" 
                        : ""
                    }`}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    {isRegistered ? "View Entry Pass" : "Join Guestlist"}
                  </Button>
                </Link>
                {isRegistered && (
                  <button 
                    className="w-12 h-12 rounded-xl bg-raised border border-border-subtle flex items-center justify-center text-muted hover:text-accent-error hover:border-accent-error/50 transition-colors disabled:opacity-50"
                    aria-label="Cancel registration"
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelling}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
                  </div>
                  
          {/* Divider */}
          <div className="border-t border-border-subtle" />
          
          {/* About Section */}
                  {event.description && (
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-accent-secondary">
                About
              </h3>
              <p className="text-sm text-secondary leading-relaxed">
                      {event.description}
                    </p>
            </div>
          )}

          {/* Divider */}
          {event.description && <div className="border-t border-border-subtle" />}
          
          {/* Event Details */}
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-accent-secondary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                          {startDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                </p>
                <p className="text-sm text-secondary">
                  {dateInfo.time}
                  {endDate && ` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </p>
                      </div>
                    </div>

            {/* Venue Card */}
                    {event.venue && (
              <VenueCard
                venue={{
                  id: event.venue.id,
                  name: event.venue.name,
                  slug: event.venue.slug,
                  city: event.venue.city,
                  state: event.venue.state,
                  country: event.venue.country,
                  cover_image_url: event.venue.cover_image_url,
                  logo_url: event.venue.logo_url,
                }}
                layout="landscape"
                showRating={false}
                showTags={false}
              />
                      )}
                    </div>

          {/* Divider */}
          <div className="border-t border-border-subtle" />
          
          {/* Actions Row */}
          <div className="flex gap-3">
                    <ShareButton
                      title={event.name}
              text={`🎉 ${event.name}\n📅 ${startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${event.venue?.name ? ` @ ${event.venue.name}` : ""}`}
                      url={shareUrl}
                      userId={userId}
                      imageUrl={event.flier_url || undefined}
                      videoUrl={event.flier_video_url || undefined}
                      compact={true}
                    />
                    <CalendarButtons
                      eventName={event.name}
                      startTime={event.start_time}
                      endTime={event.end_time}
                      description={event.description || undefined}
                      venue={event.venue || undefined}
                      url={shareUrl}
                      compact={true}
                    />
                  </div>

          {/* Organizer */}
          {event.organizer && (
            <div className="pt-2">
              <p className="text-xs text-muted">
                Organized by <span className="text-primary font-medium">{event.organizer.name}</span>
              </p>
            </div>
          )}
          
          {/* Photo Gallery */}
          <PhotoGalleryPreview
            eventSlug={params.eventSlug}
            eventId={event.id}
            eventName={event.name}
          />
          
          {/* Promoter Request */}
          <PromoterRequestButton eventId={event.id} eventSlug={params.eventSlug} />
        </div>
      </div>
    );
  }

  // ===========================================
  // DESKTOP CONTENT
  // ===========================================
  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Flier */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              {/* Flier - Video if available, otherwise Image */}
              {(event.flier_url || event.flier_video_url) && (
                <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-2xl overflow-hidden border border-border-subtle shadow-soft">
                  {event.flier_video_url ? (
                    <video
                      src={event.flier_video_url}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : event.flier_url ? (
                    <Image
                      src={event.flier_url}
                      alt={`${event.name} flier`}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 1024px) 100vw, 384px"
                    />
                  ) : null}
                </div>
              )}
              
              {/* Registration Stats */}
              <Card className="mt-6">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Registered
                    </p>
                    {spotsLeft !== null && (
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary">
                        {spotsLeft} Left
                      </p>
                    )}
                  </div>
                  {(event.registration_count || 0) > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {(event.recent_attendees || []).slice(0, 5).map((attendee: any, i: number) => (
                          attendee?.profile_picture_url ? (
                            <Image
                              key={attendee.id || i}
                              src={attendee.profile_picture_url}
                              alt={attendee.name || "Attendee"}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full border-2 border-[var(--bg-void)] object-cover"
                            />
                          ) : (
                            <div 
                              key={attendee?.id || i}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent-primary)] border-2 border-[var(--bg-void)] flex items-center justify-center"
                            >
                              <span className="text-[10px] font-bold text-[var(--text-inverse)]">
                                {attendee?.name?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            </div>
                          )
                        ))}
                        {(event.registration_count || 0) > 5 && (
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-raised)] border-2 border-[var(--bg-void)] flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary">
                              +{((event.registration_count || 0) - 5).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {(event.registration_count || 0).toLocaleString()}
                        </p>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Going</p>
                      </div>
                    </div>
                  ) : (
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-accent-secondary">
                      Be first to register for XP ✨
                    </p>
                  )}
                  {/* Progress bar */}
                  {event.capacity && (
                    <div className="w-full h-2 bg-raised rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(((event.registration_count || 0) / event.capacity) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
          
          {/* Center Column - Event Info */}
          <div className="lg:col-span-5 space-y-6">
            {/* Header Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge color="purple" variant="solid" className="font-mono uppercase">
                {dateInfo.month} {dateInfo.day}
              </Badge>
              {spotsLeft !== null && spotsLeft <= 50 && (
                <Badge color="green" variant="solid" className="font-mono uppercase">
                  Only {spotsLeft} Spots Left
                </Badge>
              )}
              {isLive && (
                <Badge color="green" variant="solid" className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Live Now
                </Badge>
              )}
            </div>
            
            {/* Event Name */}
            <h1 className="page-title text-5xl lg:text-6xl xl:text-7xl">
              {event.name}
            </h1>
            
            {/* Venue & Time Row */}
            <div className="flex items-center gap-4 flex-wrap text-secondary">
              {event.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent-secondary" />
                  {event.venue.slug ? (
                    <Link 
                      href={`/v/${event.venue.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {event.venue.name}
                    </Link>
                  ) : (
                    <span>{event.venue.name}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-secondary" />
                <span>
                  {dateInfo.time}
                  {endDate && ` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </span>
              </div>
            </div>

            {/* The Experience (Description) */}
            {event.description && (
              <div className="space-y-3 pt-4">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent-secondary flex items-center gap-2">
                  <span className="text-lg">✦</span>
                  The Experience
                </h2>
                <p className="text-base text-secondary leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}
            
            {/* Photo Gallery */}
            <PhotoGalleryPreview
              eventSlug={params.eventSlug}
              eventId={event.id}
              eventName={event.name}
            />
          </div>
          
          {/* Right Column - Actions */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              {/* Guestlist Card */}
              <div className="rounded-[var(--radius-xl)] bg-[var(--bg-glass)]/90 border border-[var(--border-subtle)] backdrop-blur-xl shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Guestlist
                    </h3>
                    <Badge color={isPast ? "slate" : "green"} variant="solid" size="sm">
                      {isPast ? "Closed" : "Open"}
                    </Badge>
                  </div>
                  
                  {/* Entry Option */}
                  <div className={`flex items-center justify-between p-3 mt-3 rounded-lg bg-raised/80 border border-border-subtle ${isPast ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary">Standard Entry</p>
                      <p className="text-[11px] text-muted">{isPast ? "Event Ended" : "Approval Required"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-bold text-primary">Free</span>
                      <CheckCircle2 className={`h-4 w-4 ${isPast ? "text-muted" : "text-accent-success"}`} />
                    </div>
                  </div>
                  
                  {/* Disclaimer */}
                  <p className="text-[10px] text-muted text-center mt-3 mb-4">
                    {isPast ? "This event has ended." : "Guestlist does not guarantee entry."}
                  </p>
                  
                  {/* CTA */}
                  {isPast ? (
                    <Button 
                      variant="secondary"
                      size="lg"
                      disabled
                      className="w-full font-mono uppercase tracking-wider opacity-60 cursor-not-allowed"
                    >
                      <Ticket className="h-4 w-4 mr-2" />
                      Guestlist Closed
                    </Button>
                  ) : (
                    <Link href={isRegistered ? getPassUrl() : getRegisterUrl()}>
                      <Button 
                        variant={isRegistered ? "secondary" : "primary"}
                        size="lg"
                        className={`w-full font-mono uppercase tracking-wider ${
                          isRegistered 
                            ? "bg-accent-success/20 border-accent-success/50 text-accent-success hover:bg-accent-success/30" 
                            : ""
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <QrCode className="h-4 w-4 mr-2" />
                            View Pass
                          </>
                        ) : (
                          <>
                            Request Entry
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Actions Row */}
              <div className="flex gap-2">
                <ShareButton
                  title={event.name}
                  text={`🎉 ${event.name}`}
                  url={shareUrl}
                  userId={userId}
                  imageUrl={event.flier_url || undefined}
                  iconOnly
                />
                <CalendarButtons
                  eventName={event.name}
                  startTime={event.start_time}
                  endTime={event.end_time}
                  description={event.description || undefined}
                  venue={event.venue || undefined}
                  url={shareUrl}
                />
                {canEditEvent && (
                  <Link href={getManageUrl()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="Manage event"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
              
              {/* Promoter Request */}
              <PromoterRequestButton eventId={event.id} eventSlug={params.eventSlug} />
            </div>
          </div>
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
