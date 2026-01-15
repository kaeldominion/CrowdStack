"use client";

import { useState, useEffect } from "react";
import { Modal, Badge, LoadingSpinner, Button, VipStatus, Tabs, TabsList, TabsTrigger, TabsContent, VipBadge } from "@crowdstack/ui";
import { InlineEditField } from "@/components/inline/InlineEditField";
import { User, Mail, Phone, Calendar, MapPin, CheckCircle2, XCircle, AlertTriangle, Trash2, Crown, Star, TrendingUp, History, MessageSquare, TableIcon, Users, Sparkles, StickyNote } from "lucide-react";
import Link from "next/link";

interface AttendeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendeeId: string;
  role: "organizer" | "venue" | "promoter";
  // Action handlers (optional - for mobile view)
  eventId?: string;
  registrationId?: string;
  canEditNotes?: boolean;
  canToggleEventVip?: boolean;
  canToggleVenueVip?: boolean;
  canToggleOrganizerVip?: boolean;
  onSaveNotes?: (registrationId: string, notes: string) => Promise<void>;
  onToggleEventVip?: (registrationId: string, isCurrentlyVip?: boolean) => Promise<void>;
  onToggleVenueVip?: (attendeeId: string, isCurrentlyVip: boolean) => Promise<void>;
  onToggleOrganizerVip?: (attendeeId: string, isCurrentlyVip: boolean) => Promise<void>;
  togglingVip?: string | null;
  attendeeNotes?: string;
  isEventVip?: boolean;
  isVenueVip?: boolean;
  isOrganizerVip?: boolean;
  isGlobalVip?: boolean;
  // Prefetched data from hover (optional - speeds up modal load)
  prefetchedData?: AttendeeDetails | null;
}

interface EventRegistration {
  id: string;
  registered_at: string;
  event?: {
    id: string;
    name: string;
    start_time: string;
    venue?: {
      name: string;
    } | null;
  } | null;
  checkins?: Array<{
    id: string;
    checked_in_at: string;
  }>;
}

interface FeedbackItem {
  id: string;
  rating: number;
  feedback_type: "positive" | "negative";
  comment?: string | null;
  categories?: string[];
  free_text?: string | null;
  submitted_at: string;
  resolved_at?: string | null;
  event_id?: string | null;
  event_name: string;
  event_date?: string | null;
}

interface CheckInItem {
  id: string;
  checked_in_at: string;
  checked_in_by?: string | null;
  event_id?: string | null;
  event_name: string;
  event_date?: string | null;
}

interface TableBookingItem {
  id: string;
  guest_name: string;
  party_size: number;
  status: string;
  minimum_spend?: number | null;
  deposit_amount?: number | null;
  created_at: string;
  event_id?: string | null;
  event_name: string;
  event_date?: string | null;
  table_name: string;
  table_capacity: number;
}

interface NoteItem {
  id: string;
  note_text: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  created_by_email?: string | null;
  registration_id: string;
  event_id?: string | null;
  event_name: string;
}

interface AttendeeDetails {
  attendee: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    created_at: string;
    user_id?: string | null;
    is_global_vip?: boolean;
    global_vip_reason?: string | null;
  } | null;
  events?: EventRegistration[];
  referral_events?: EventRegistration[];
  upcoming_events?: EventRegistration[];
  flags?: {
    reason: string;
    expires_at: string | null;
  } | null;
  vip?: {
    isGlobalVip: boolean;
    isVenueVip?: boolean;
    isOrganizerVip?: boolean;
    venueVipReason?: string | null;
    organizerVipReason?: string | null;
    venueName?: string;
    organizerName?: string;
  } | null;
  xp?: {
    total: number;
    at_venue?: number;
    at_organizer?: number;
  } | null;
  feedback?: FeedbackItem[];
  checkins?: CheckInItem[];
  tableBookings?: TableBookingItem[];
  notesHistory?: NoteItem[];
}

export function AttendeeDetailModal({
  isOpen,
  onClose,
  attendeeId,
  role,
  eventId,
  registrationId,
  canEditNotes = false,
  canToggleEventVip = false,
  canToggleVenueVip = false,
  canToggleOrganizerVip = false,
  onSaveNotes,
  onToggleEventVip,
  onToggleVenueVip,
  onToggleOrganizerVip,
  togglingVip = null,
  attendeeNotes = "",
  isEventVip = false,
  isVenueVip = false,
  isOrganizerVip = false,
  isGlobalVip = false,
  prefetchedData = null,
}: AttendeeDetailModalProps) {
  const [details, setDetails] = useState<AttendeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingRegistrationId, setRemovingRegistrationId] = useState<string | null>(null);

  const loadDetails = async () => {
    // If we have prefetched data, use it immediately
    if (prefetchedData) {
      setDetails(prefetchedData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endpoint = `/api/${role}/attendees/${attendeeId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load attendee details");
      }

      const data = await response.json();
      setDetails(data);
    } catch (err) {
      console.error("Error loading attendee details:", err);
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && attendeeId) {
      // Use prefetched data if available, otherwise fetch
      if (prefetchedData) {
        setDetails(prefetchedData);
        setLoading(false);
        setError(null);
      } else {
        loadDetails();
      }
    } else {
      setDetails(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, attendeeId, role, prefetchedData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventsList = () => {
    if (role === "promoter" && details) {
      return [
        ...(details.referral_events || []).map((e) => ({ ...e, type: "referral" as const })),
        ...(details.upcoming_events || []).map((e) => ({ ...e, type: "upcoming" as const })),
      ];
    }
    return (details?.events || []).map((e) => ({ ...e, type: "regular" as const }));
  };

  const handleRemoveRegistration = async (registrationId: string) => {
    if (!confirm("Are you sure you want to remove this registration? This action cannot be undone.")) {
      return;
    }

    setRemovingRegistrationId(registrationId);
    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove registration");
      }

      // Reload details to refresh the list
      await loadDetails();
    } catch (err: any) {
      console.error("Error removing registration:", err);
      alert(err.message || "Failed to remove registration. Please try again.");
    } finally {
      setRemovingRegistrationId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attendee Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner text="Loading..." size="md" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-secondary">{error}</p>
        </div>
      ) : details?.attendee ? (
        <div className="space-y-6">
          {/* Attendee Info */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                details.attendee.is_global_vip 
                  ? "bg-gradient-to-br from-amber-400/30 to-yellow-500/30 ring-2 ring-amber-400/50" 
                  : "bg-accent-secondary/20"
              }`}>
                {details.attendee.is_global_vip ? (
                  <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400" />
                ) : (
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-primary truncate">
                  {details.attendee.name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <VipStatus 
                    isGlobalVip={details.vip?.isGlobalVip || details.attendee.is_global_vip}
                    isVenueVip={details.vip?.isVenueVip}
                    isOrganizerVip={details.vip?.isOrganizerVip}
                    venueName={details.vip?.venueName}
                    organizerName={details.vip?.organizerName}
                    size="sm"
                  />
                  {details.attendee.user_id && (
                    <Badge variant="success" size="sm">Linked Account</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              {details.attendee.email && (
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-secondary flex-shrink-0" />
                  <span className="text-sm text-primary truncate">{details.attendee.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                <span className="text-sm text-primary">{details.attendee.phone}</span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Calendar className="h-4 w-4 text-secondary flex-shrink-0" />
                <span className="text-xs text-secondary">
                  Joined {formatDate(details.attendee.created_at)}
                </span>
              </div>
            </div>

            {/* XP Points */}
            {details.xp && (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-4 border-t border-border-subtle">
                <div className="p-2 sm:p-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-secondary" />
                    <span className="text-[10px] sm:text-xs text-secondary font-medium">Total XP</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-primary">{details.xp.total.toLocaleString()}</p>
                </div>
                {(details.xp.at_venue !== undefined || details.xp.at_organizer !== undefined) && (
                  <div className="p-2 sm:p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-primary" />
                      <span className="text-[10px] sm:text-xs text-secondary font-medium">
                        {role === "venue" ? "At Venue" : "With You"}
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-primary">
                      {(details.xp.at_venue || details.xp.at_organizer || 0).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons (Mobile/Quick Actions) */}
          {(canEditNotes || canToggleEventVip || canToggleVenueVip || canToggleOrganizerVip) && registrationId && (
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <h3 className="section-header !mb-3">Quick Actions</h3>
              
              {/* Notes Editor */}
              {canEditNotes && onSaveNotes && (
                <div>
                  <label className="text-xs text-secondary mb-1.5 block">Notes</label>
                  <InlineEditField
                    value={attendeeNotes}
                    onSave={(notes) => onSaveNotes(registrationId, notes)}
                    placeholder="Add note..."
                  />
                </div>
              )}

              {/* VIP Toggle Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {canToggleEventVip && onToggleEventVip && (
                  <button
                    onClick={() => onToggleEventVip(registrationId, isEventVip)}
                    disabled={togglingVip === registrationId}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      isEventVip
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-emerald-400"
                    }`}
                  >
                    {togglingVip === registrationId ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <VipBadge level="event" variant="icon" size="sm" iconOnly />
                    )}
                    <span className="text-sm font-medium">
                      {isEventVip ? "Event VIP" : "Mark Event VIP"}
                    </span>
                  </button>
                )}
                
                {canToggleVenueVip && onToggleVenueVip && (
                  <button
                    onClick={() => onToggleVenueVip(attendeeId, isVenueVip)}
                    disabled={(togglingVip === attendeeId) || isGlobalVip}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      isVenueVip
                        ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                        : "bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--accent-primary)]"
                    } ${isGlobalVip ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={isGlobalVip ? "Cannot override Global VIP" : ""}
                  >
                    {togglingVip === attendeeId ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Star className={`h-4 w-4 ${isVenueVip ? "fill-current" : ""}`} />
                    )}
                    <span className="text-sm font-medium">
                      {isVenueVip ? "Venue VIP" : "Mark Venue VIP"}
                    </span>
                  </button>
                )}
                
                {canToggleOrganizerVip && onToggleOrganizerVip && (
                  <button
                    onClick={() => onToggleOrganizerVip(attendeeId, isOrganizerVip)}
                    disabled={(togglingVip === attendeeId) || isGlobalVip}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      isOrganizerVip
                        ? "bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30"
                        : "bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--accent-secondary)]"
                    } ${isGlobalVip ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={isGlobalVip ? "Cannot override Global VIP" : ""}
                  >
                    {togglingVip === attendeeId ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Sparkles className={`h-4 w-4 ${isOrganizerVip ? "fill-current" : ""}`} />
                    )}
                    <span className="text-sm font-medium">
                      {isOrganizerVip ? "Organizer VIP" : "Mark Organizer VIP"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Flags/Warnings (Venue only) */}
          {role === "venue" && details.flags && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-primary">Flagged Guest</h3>
              </div>
              <p className="text-sm text-secondary">{details.flags.reason}</p>
              {details.flags.expires_at && (
                <p className="text-xs text-secondary mt-1">
                  Expires: {formatDate(details.flags.expires_at)}
                </p>
              )}
            </div>
          )}

          {/* Comprehensive History Tabs */}
          <div className="border-t border-border pt-4">
            <h3 className="section-header !mb-3">History</h3>
            <Tabs defaultValue="events">
              <TabsList className="flex-wrap gap-1">
                <TabsTrigger value="events" className="text-xs sm:text-sm">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Events</span>
                  <span className="sm:hidden">Events</span>
                  <span className="ml-1">({getEventsList().length})</span>
                </TabsTrigger>
                {(role === "venue" || role === "organizer") && (
                  <TabsTrigger value="bookings" className="text-xs sm:text-sm">
                    <TableIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Bookings</span>
                    <span className="sm:hidden">Tables</span>
                    <span className="ml-1">({details.tableBookings?.length || 0})</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="feedback" className="text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Feedback</span>
                  <span className="sm:hidden">FB</span>
                  <span className="ml-1">({details.feedback?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm">
                  <StickyNote className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Notes</span>
                  <span className="sm:hidden">Notes</span>
                  <span className="ml-1">({details.notesHistory?.length || 0})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                {getEventsList().length === 0 ? (
                  <p className="text-secondary text-sm py-4">No events found</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
                    {(() => {
                      const eventsList = getEventsList();
                      const totalEvents = eventsList.length;
                      const checkedInEvents = eventsList.filter((reg: any) => {
                        const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
                        if (!event) return false;
                        
                        // Check if there's a valid (not undone) check-in in the registration's checkins array
                        const validCheckins = reg.checkins && Array.isArray(reg.checkins) 
                          ? reg.checkins.filter((c: any) => !c.undo_at)
                          : [];
                        const hasCheckinInReg = validCheckins.length > 0;
                        
                        // Also check the separate checkins array for this event
                        const hasCheckinInHistory = details.checkins?.some(
                          (c: CheckInItem) => c.event_id === event.id
                        );
                        
                        return hasCheckinInReg || hasCheckinInHistory;
                      }).length;
                      const checkInRate = totalEvents > 0 ? Math.round((checkedInEvents / totalEvents) * 100) : 0;
                      
                      return (
                        <>
                          {/* Check-in Rate Summary */}
                          <div className="p-3 rounded-lg border border-border-subtle bg-raised mb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-primary">Check-in Rate</p>
                                <p className="text-xs text-secondary mt-0.5">
                                  {checkedInEvents} of {totalEvents} events
                                </p>
                              </div>
                              <div className="text-2xl font-bold text-primary">
                                {checkInRate}%
                              </div>
                            </div>
                          </div>
                          
                          {/* Events List */}
                          {eventsList.map((reg: any) => {
                            const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
                            if (!event) return null;

                            // Check if there's a check-in in the registration's checkins array (filter out undone check-ins)
                            const validCheckins = reg.checkins && Array.isArray(reg.checkins) 
                              ? reg.checkins.filter((c: any) => !c.undo_at)
                              : [];
                            const checkinInReg = validCheckins.length > 0 ? validCheckins[0] : null;
                            
                            // Also check the separate checkins array for this event
                            const checkinInHistory = details.checkins?.find(
                              (c: CheckInItem) => c.event_id === event.id
                            );
                            
                            const checkin = checkinInReg || checkinInHistory;

                            return (
                              <div
                                key={reg.id}
                                className="p-4 rounded-lg border border-border bg-glass/50"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-primary">{event.name}</h4>
                                      {role === "promoter" && reg.type === "referral" && (
                                        <Badge variant="primary" className="text-xs">Your Referral</Badge>
                                      )}
                                      {role === "promoter" && reg.type === "upcoming" && (
                                        <Badge variant="default" className="text-xs">Upcoming</Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(event.start_time)}
                                      </div>
                                      {event.venue && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {event.venue.name}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        Registered: {formatDate(reg.registered_at)}
                                      </div>
                                      {checkin && (
                                        <div className="flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3 text-success" />
                                          Checked in: {formatDate(checkin.checked_in_at || (checkinInHistory?.checked_in_at || ""))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 ml-4 flex flex-col items-end gap-2">
                                    {checkin ? (
                                      <div className="flex items-center gap-1 text-success">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="text-sm font-medium">Checked In</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-secondary">
                                        <XCircle className="h-5 w-5" />
                                        <span className="text-sm">Not Checked In</span>
                                      </div>
                                    )}
                                    {/* Remove Registration Button (organizer and venue only) */}
                                    {(role === "organizer" || role === "venue") && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleRemoveRegistration(reg.id)}
                                          disabled={removingRegistrationId === reg.id}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        >
                                          {removingRegistrationId === reg.id ? (
                                            <>
                                              <LoadingSpinner size="sm" className="mr-1" />
                                              Removing...
                                            </>
                                          ) : (
                                            <>
                                              <Trash2 className="h-3 w-3 mr-1" />
                                              Remove
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
              </TabsContent>

              {/* Table Bookings Tab (Venue and Organizer) */}
              {(role === "venue" || role === "organizer") && (
                <TabsContent value="bookings">
                  {!details.tableBookings || details.tableBookings.length === 0 ? (
                    <p className="text-secondary text-sm py-4">No table bookings found</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
                      {details.tableBookings.map((booking) => (
                        <div key={booking.id} className="p-4 rounded-lg border border-border-subtle bg-raised">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-primary">{booking.event_name}</p>
                              <p className="text-sm text-secondary">{booking.table_name}</p>
                            </div>
                            <Badge
                              variant={
                                booking.status === "confirmed"
                                  ? "success"
                                  : booking.status === "pending"
                                  ? "warning"
                                  : booking.status === "cancelled"
                                  ? "error"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Party of {booking.party_size}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {booking.event_date
                                ? new Date(booking.event_date).toLocaleDateString()
                                : "Unknown date"}
                            </div>
                            {booking.minimum_spend && (
                              <div className="text-xs">
                                Min Spend: {booking.minimum_spend.toLocaleString()}
                              </div>
                            )}
                            {booking.deposit_amount && (
                              <div className="text-xs">
                                Deposit: {booking.deposit_amount.toLocaleString()}
                              </div>
                            )}
                          </div>
                          {booking.event_id && (
                            <div className="mt-2">
                              <Link href={`/app/${role}/events/${booking.event_id}`}>
                                <Button variant="ghost" size="sm">View Event</Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="feedback">
                {!details.feedback || details.feedback.length === 0 ? (
                  <p className="text-secondary text-sm py-4">No feedback submitted</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
                    {details.feedback.map((feedback) => (
                      <div key={feedback.id} className="p-4 rounded-lg border border-border-subtle bg-raised">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= feedback.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <Badge
                              variant={feedback.feedback_type === "positive" ? "success" : "warning"}
                              className="text-xs"
                            >
                              {feedback.feedback_type}
                            </Badge>
                            {feedback.resolved_at && (
                              <Badge variant="success" className="text-xs">Resolved</Badge>
                            )}
                          </div>
                          <span className="text-xs text-secondary">
                            {new Date(feedback.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-medium text-primary mb-1">{feedback.event_name}</p>
                        {feedback.comment && (
                          <p className="text-sm text-secondary mb-2">"{feedback.comment}"</p>
                        )}
                        {feedback.free_text && (
                          <p className="text-sm text-secondary mb-2">{feedback.free_text}</p>
                        )}
                        {feedback.categories && feedback.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {feedback.categories.map((cat) => (
                              <Badge key={cat} variant="outline" size="sm" className="text-xs">
                                {cat.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {feedback.event_id && (
                          <div className="mt-2">
                            <Link href={`/app/${role === "venue" ? "venue" : "organizer"}/events/${feedback.event_id}`}>
                              <Button variant="ghost" size="sm">View Event</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes">
                {!details.notesHistory || details.notesHistory.length === 0 ? (
                  <p className="text-secondary text-sm py-4">No notes found</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
                    {details.notesHistory.map((note) => (
                      <div key={note.id} className="p-4 rounded-lg border border-border-subtle bg-raised">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-primary mb-1">{note.event_name}</p>
                            <p className="text-sm text-secondary whitespace-pre-wrap">{note.note_text}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <User className="h-3 w-3" />
                            <span>{note.created_by_name}</span>
                            {note.created_by_email && (
                              <span className="text-[10px] opacity-75">({note.created_by_email})</span>
                            )}
                          </div>
                          <span className="text-xs text-secondary">
                            {formatDate(note.created_at)}
                          </span>
                        </div>
                        {note.event_id && (
                          <div className="mt-2">
                            <Link href={`/app/${role === "venue" ? "venue" : "organizer"}/events/${note.event_id}`}>
                              <Button variant="ghost" size="sm">View Event</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

