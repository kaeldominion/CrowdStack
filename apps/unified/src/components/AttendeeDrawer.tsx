"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetSection,
  SheetFooter,
  Badge,
  LoadingSpinner,
  Button,
  VipStatus,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  VipBadge,
} from "@crowdstack/ui";
import { InlineEditField } from "@/components/inline/InlineEditField";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Crown,
  Star,
  TrendingUp,
  History,
  MessageSquare,
  TableIcon,
  Users,
  Sparkles,
  Award,
  Ticket,
  Instagram,
  Cake,
  Save,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface AttendeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  attendeeId: string;
  role: "venue" | "organizer" | "promoter";
  venueId?: string | null;
  onToggleVip?: (attendeeId: string, isCurrentlyVip: boolean) => Promise<void>;
  togglingVip?: string | null;
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
    undo_at?: string | null;
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
    instagram_handle?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
  } | null;
  events?: EventRegistration[];
  flags?: {
    reason: string;
    expires_at: string | null;
    strike_count?: number;
  } | null;
  vip?: {
    isGlobalVip: boolean;
    isVenueVip?: boolean;
    venueVipReason?: string | null;
  } | null;
  xp?: {
    total: number;
    at_venue?: number;
  } | null;
  feedback?: FeedbackItem[];
  checkins?: CheckInItem[];
  tableBookings?: TableBookingItem[];
  notesHistory?: NoteItem[];
  // Simple note for this venue/organizer
  attendeeNote?: {
    note: string;
    updated_at: string;
    updated_by_name: string;
  } | null;
}

export function AttendeeDrawer({
  isOpen,
  onClose,
  attendeeId,
  role,
  venueId,
  onToggleVip,
  togglingVip,
}: AttendeeDrawerProps) {
  const [details, setDetails] = useState<AttendeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingRegistrationId, setRemovingRegistrationId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const loadDetails = async () => {
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
      setNotes(data.attendeeNote?.note || "");
    } catch (err) {
      console.error("Error loading attendee details:", err);
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && attendeeId) {
      loadDetails();
    } else {
      setDetails(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, attendeeId, role]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRemoveRegistration = async (registrationId: string) => {
    if (!confirm("Are you sure you want to remove this registration?")) {
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

      await loadDetails();
    } catch (err: any) {
      console.error("Error removing registration:", err);
      alert(err.message || "Failed to remove registration");
    } finally {
      setRemovingRegistrationId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!details?.events?.[0]?.id) return;

    // Find a registration ID from the first event to use for the notes endpoint
    const firstEventReg = details.events[0];
    const eventId = Array.isArray(firstEventReg.event)
      ? firstEventReg.event[0]?.id
      : firstEventReg.event?.id;

    if (!eventId) return;

    setSavingNotes(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/registrations/${firstEventReg.id}/notes`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, role }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save notes");
      }

      const data = await response.json();
      // Update local state with new note metadata
      setDetails((prev) => prev ? {
        ...prev,
        attendeeNote: {
          note: data.notes,
          updated_at: data.updated_at,
          updated_by_name: data.updated_by_name,
        },
      } : null);
    } catch (err: any) {
      console.error("Error saving notes:", err);
      alert(err.message || "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  // Calculate stats
  const eventsList = details?.events || [];
  const totalEvents = eventsList.length;
  const checkedInEvents = eventsList.filter((reg) => {
    const validCheckins =
      reg.checkins?.filter((c) => !c.undo_at) || [];
    return validCheckins.length > 0;
  }).length;
  const checkInRate =
    totalEvents > 0 ? Math.round((checkedInEvents / totalEvents) * 100) : 0;

  // Calculate average rating from feedback
  const avgRating =
    details?.feedback && details.feedback.length > 0
      ? Math.round(
          (details.feedback.reduce((sum, fb) => sum + fb.rating, 0) /
            details.feedback.length) *
            10
        ) / 10
      : null;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      showCloseButton={true}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24 bg-[var(--bg-void)]">
          <LoadingSpinner text="Loading..." size="md" />
        </div>
      ) : error ? (
        <div className="py-24 text-center px-4 bg-[var(--bg-void)]">
          <AlertTriangle className="h-12 w-12 text-[var(--accent-error)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      ) : details?.attendee ? (
        <div className="flex flex-col h-full bg-[var(--bg-void)]">
          {/* Profile Header */}
          <div className="p-5 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)]">
            <div className="flex items-start gap-4">
              <div
                className={`h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                  details.attendee.is_global_vip
                    ? "bg-gradient-to-br from-amber-400/30 to-yellow-500/30 ring-2 ring-amber-400/50"
                    : "bg-[var(--bg-glass)] border border-[var(--border-subtle)]"
                }`}
              >
                {details.attendee.is_global_vip ? (
                  <Crown className="h-7 w-7 text-amber-400" />
                ) : (
                  <User className="h-7 w-7 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                  {details.attendee.name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <VipStatus
                    isGlobalVip={
                      details.vip?.isGlobalVip || details.attendee.is_global_vip
                    }
                    isVenueVip={details.vip?.isVenueVip}
                    size="sm"
                  />
                  {details.attendee.user_id && (
                    <Badge variant="success" size="sm">
                      Linked
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-4 space-y-1.5">
              {details.attendee.email && (
                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <Mail className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                  <span className="truncate">{details.attendee.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <Phone className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                <span>{details.attendee.phone}</span>
              </div>
              {details.attendee.instagram_handle && (
                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <Instagram className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                  <span>@{details.attendee.instagram_handle}</span>
                </div>
              )}
              {details.attendee.date_of_birth && (
                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <Cake className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                  <span>{formatDate(details.attendee.date_of_birth)}</span>
                </div>
              )}
              {details.attendee.gender && (
                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <User className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                  <span className="capitalize">{details.attendee.gender}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>First seen {formatDate(details.attendee.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={`px-5 py-4 grid gap-3 bg-[var(--bg-base)] border-b border-[var(--border-subtle)] ${
            role === "venue" ? "grid-cols-4" : "grid-cols-3"
          }`}>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {totalEvents}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Events</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
              <p className="text-xl font-bold text-[var(--accent-success)]">
                {checkInRate}%
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Check-in</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
              <p className="text-xl font-bold text-[var(--accent-primary)]">
                {details.xp?.at_venue?.toLocaleString() || 0}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">XP</p>
            </div>
            {role === "venue" && (
              <div className="text-center p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
                {avgRating ? (
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl font-bold text-[var(--text-primary)]">
                      {avgRating}
                    </span>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-[var(--text-muted)]">-</p>
                )}
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Pulse</p>
              </div>
            )}
          </div>

          {/* Flags/Warnings */}
          {details.flags && (
            <div className="mx-5 my-3 p-3 rounded-lg bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-[var(--accent-warning)]" />
                <span className="font-medium text-[var(--accent-warning)] text-sm">
                  Flagged Guest
                  {details.flags.strike_count
                    ? ` (${details.flags.strike_count} strikes)`
                    : ""}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {details.flags.reason}
              </p>
            </div>
          )}

          {/* VIP Toggle */}
          {onToggleVip && (
            <div className="px-5 pb-4">
              <button
                onClick={() =>
                  onToggleVip(attendeeId, details.vip?.isVenueVip || false)
                }
                disabled={
                  togglingVip === attendeeId || details.attendee.is_global_vip
                }
                className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  details.vip?.isVenueVip
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-amber-400 hover:border-amber-400/40"
                } ${
                  details.attendee.is_global_vip
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                title={
                  details.attendee.is_global_vip
                    ? "Cannot override Global VIP"
                    : ""
                }
              >
                {togglingVip === attendeeId ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Crown
                    className={`h-4 w-4 ${
                      details.vip?.isVenueVip ? "fill-current" : ""
                    }`}
                  />
                )}
                <span className="text-sm font-medium">
                  {details.vip?.isVenueVip
                    ? "Venue VIP"
                    : "Mark as Venue VIP"}
                </span>
              </button>
            </div>
          )}

          {/* Simple Notes Section */}
          <div className="px-5 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Notes
                </label>
                {details.attendeeNote?.updated_at && (
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(details.attendeeNote.updated_at)} by {details.attendeeNote.updated_by_name}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this guest..."
                  className="flex-1 min-h-[60px] px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === (details.attendeeNote?.note || "")}
                  size="sm"
                  variant="secondary"
                  className="self-end"
                >
                  {savingNotes ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="guestlist" className="h-full flex flex-col">
              <TabsList className="px-5 py-2.5 flex-shrink-0 bg-[var(--bg-raised)] border-y border-[var(--border-subtle)]">
                <TabsTrigger value="guestlist" className="text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Guestlist ({totalEvents})
                </TabsTrigger>
                <TabsTrigger value="tables" className="text-xs">
                  <TableIcon className="h-3.5 w-3.5 mr-1.5" />
                  Tables ({details.tableBookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="tickets" className="text-xs">
                  <Ticket className="h-3.5 w-3.5 mr-1.5" />
                  Tickets (0)
                </TabsTrigger>
                {role === "venue" && (
                  <TabsTrigger value="pulse" className="text-xs">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Pulse ({details.feedback?.length || 0})
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 overflow-y-auto bg-[var(--bg-base)]">
                {/* Guestlist Tab */}
                <TabsContent value="guestlist" className="p-5 space-y-2.5">
                  {eventsList.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm text-center py-8">
                      No events found
                    </p>
                  ) : (
                    eventsList.map((reg) => {
                      const event = Array.isArray(reg.event)
                        ? reg.event[0]
                        : reg.event;
                      if (!event) return null;

                      const validCheckins =
                        reg.checkins?.filter((c) => !c.undo_at) || [];
                      const hasCheckin = validCheckins.length > 0;

                      return (
                        <div
                          key={reg.id}
                          className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[var(--text-primary)] text-sm truncate">
                                {event.name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {formatDate(event.start_time)}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {hasCheckin ? (
                                <Badge variant="success" size="sm">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Checked In
                                </Badge>
                              ) : (
                                <Badge variant="default" size="sm">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No Show
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                {/* Tables Tab */}
                <TabsContent value="tables" className="p-5 space-y-2.5">
                  {!details.tableBookings || details.tableBookings.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm text-center py-8">
                      No table bookings found
                    </p>
                  ) : (
                    details.tableBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)]"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-primary)] text-sm truncate">
                              {booking.event_name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {booking.table_name}
                            </p>
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
                            size="sm"
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Party of {booking.party_size}
                          </span>
                          <span>
                            {booking.event_date
                              ? formatDate(booking.event_date)
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tickets Tab - Placeholder */}
                <TabsContent value="tickets" className="p-5 space-y-2.5">
                  <div className="text-center py-8">
                    <Ticket className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                    <p className="text-[var(--text-secondary)] text-sm">
                      Ticket history coming soon
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">
                      Track purchased tickets and attendance
                    </p>
                  </div>
                </TabsContent>

                {/* Pulse Tab - Venue only */}
                {role === "venue" && (
                  <TabsContent value="pulse" className="p-5 space-y-2.5">
                    {!details.feedback || details.feedback.length === 0 ? (
                      <p className="text-[var(--text-secondary)] text-sm text-center py-8">
                        No pulse feedback submitted
                      </p>
                    ) : (
                      details.feedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)]"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${
                                      star <= feedback.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-600"
                                    }`}
                                  />
                                ))}
                              </div>
                              <Badge
                                variant={
                                  feedback.feedback_type === "positive"
                                    ? "success"
                                    : "warning"
                                }
                                size="sm"
                              >
                                {feedback.feedback_type}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                              {formatDate(feedback.submitted_at)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-primary)] mb-1">
                            {feedback.event_name}
                          </p>
                          {feedback.comment && (
                            <p className="text-xs text-[var(--text-secondary)] italic mt-2 pl-2 border-l-2 border-[var(--border-subtle)]">
                              "{feedback.comment}"
                            </p>
                          )}
                          {feedback.categories && feedback.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {feedback.categories.map((cat) => (
                                <Badge key={cat} variant="outline" size="sm">
                                  {cat.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                )}

              </div>
            </Tabs>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
