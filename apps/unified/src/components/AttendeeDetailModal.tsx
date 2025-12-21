"use client";

import { useState, useEffect } from "react";
import { Modal, Badge, LoadingSpinner } from "@crowdstack/ui";
import { User, Mail, Phone, Calendar, MapPin, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface AttendeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendeeId: string;
  role: "organizer" | "venue" | "promoter";
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

interface AttendeeDetails {
  attendee: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    created_at: string;
    user_id?: string | null;
  } | null;
  events?: EventRegistration[];
  referral_events?: EventRegistration[];
  upcoming_events?: EventRegistration[];
  flags?: {
    reason: string;
    expires_at: string | null;
  } | null;
}

export function AttendeeDetailModal({
  isOpen,
  onClose,
  attendeeId,
  role,
}: AttendeeDetailModalProps) {
  const [details, setDetails] = useState<AttendeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <p className="text-foreground-muted">{error}</p>
        </div>
      ) : details?.attendee ? (
        <div className="space-y-6">
          {/* Attendee Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{details.attendee.name}</h2>
                {details.attendee.user_id && (
                  <Badge variant="success" className="mt-1">Linked Account</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {details.attendee.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-foreground-muted" />
                  <span className="text-foreground">{details.attendee.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-foreground-muted" />
                <span className="text-foreground">{details.attendee.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-foreground-muted" />
                <span className="text-sm text-foreground-muted">
                  Joined {formatDate(details.attendee.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Flags/Warnings (Venue only) */}
          {role === "venue" && details.flags && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-foreground">Flagged Guest</h3>
              </div>
              <p className="text-sm text-foreground-muted">{details.flags.reason}</p>
              {details.flags.expires_at && (
                <p className="text-xs text-foreground-muted mt-1">
                  Expires: {formatDate(details.flags.expires_at)}
                </p>
              )}
            </div>
          )}

          {/* Event History */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {role === "promoter" ? "Event History" : "Events"} ({getEventsList().length})
            </h3>

            {getEventsList().length === 0 ? (
              <p className="text-foreground-muted text-sm">No events found</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getEventsList().map((reg: any) => {
                  const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
                  if (!event) return null;

                  const checkin = reg.checkins && reg.checkins.length > 0 ? reg.checkins[0] : null;

                  return (
                    <div
                      key={reg.id}
                      className="p-4 rounded-lg border border-border bg-surface/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground">{event.name}</h4>
                            {role === "promoter" && reg.type === "referral" && (
                              <Badge variant="primary" className="text-xs">Your Referral</Badge>
                            )}
                            {role === "promoter" && reg.type === "upcoming" && (
                              <Badge variant="default" className="text-xs">Upcoming</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
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
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {checkin ? (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="text-sm font-medium">Checked In</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-foreground-muted">
                              <XCircle className="h-5 w-5" />
                              <span className="text-sm">Not Checked In</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

