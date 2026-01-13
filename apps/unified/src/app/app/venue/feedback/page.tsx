"use client";

import { useState, useEffect } from "react";
import { Badge, Button, LoadingSpinner, useToast, Tabs, TabsList, TabsTrigger, TabsContent, Select, Modal } from "@crowdstack/ui";
import { Star, MessageSquare, AlertCircle, CheckCircle2, XCircle, Send, Mail, Phone, User, History, Activity } from "lucide-react";
import Link from "next/link";

interface FeedbackItem {
  id: string;
  rating: number;
  feedback_type: "positive" | "negative";
  comment?: string | null;
  categories: string[];
  free_text?: string | null;
  submitted_at: string;
  attendee_id?: string | null;
  attendee_name?: string | null;
  event_id: string;
  event_name: string;
  event_date?: string;
  resolved_at?: string | null;
  internal_notes?: string | null;
}

interface VenueFeedbackStats {
  total_feedback: number;
  average_rating: number;
  events_with_feedback: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  category_breakdown: Record<string, number>;
  recent_feedback: FeedbackItem[];
}

interface EventOption {
  id: string;
  name: string;
  start_time: string;
}

interface CheckedInAttendee {
  registration_id: string;
  attendee_id: string;
  name: string;
  email: string | null;
  checked_in: boolean;
}

export default function VenueFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VenueFeedbackStats | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unresolved" | "resolved">("all");
  const [showManualRequest, setShowManualRequest] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [attendees, setAttendees] = useState<CheckedInAttendee[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [attendeeDetails, setAttendeeDetails] = useState<any>(null);
  const [loadingAttendeeDetails, setLoadingAttendeeDetails] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/venue/feedback/stats");
      if (!response.ok) {
        throw new Error("Failed to load feedback");
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toastError("Failed to load feedback data.", "Error");
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = stats?.recent_feedback.filter((item) => {
    if (activeTab === "resolved") return item.resolved_at;
    if (activeTab === "unresolved") return !item.resolved_at;
    return true;
  }) || [];

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch("/api/venue/events?event_status=published");
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      // Filter to events that have ended (can request feedback)
      const now = new Date();
      const pastEvents = (data.events || []).filter((e: any) => 
        new Date(e.start_time) < now
      );
      setEvents(pastEvents);
    } catch (error) {
      console.error("Error loading events:", error);
      toastError("Failed to load events", "Error");
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadAttendees = async (eventId: string) => {
    setLoadingAttendees(true);
    try {
      const response = await fetch(`/api/venue/events/${eventId}/feedback/test-attendees`);
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data.attendees || []);
    } catch (error) {
      console.error("Error loading attendees:", error);
      toastError("Failed to load attendees", "Error");
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedEventId || !selectedRegistrationId) {
      toastError("Please select an event and attendee", "Error");
      return;
    }

    setSendingRequest(true);
    try {
      const response = await fetch(`/api/venue/events/${selectedEventId}/feedback/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: selectedRegistrationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send feedback request");
      }

      const data = await response.json();
      toastSuccess(`Feedback request email sent to ${data.attendee.email}. The email has been logged to email_send_logs.`, "Feedback Request Sent");
      setSelectedRegistrationId("");
      // Reload feedback stats
      loadFeedback();
    } catch (error: any) {
      console.error("Error sending feedback request:", error);
      toastError(error.message || "Failed to send feedback request", "Error");
    } finally {
      setSendingRequest(false);
    }
  };

  useEffect(() => {
    if (showManualRequest && events.length === 0) {
      loadEvents();
    }
  }, [showManualRequest]);

  useEffect(() => {
    if (selectedEventId) {
      loadAttendees(selectedEventId);
      setSelectedRegistrationId("");
    } else {
      setAttendees([]);
      setSelectedRegistrationId("");
    }
  }, [selectedEventId]);

  const loadAttendeeDetails = async (attendeeId: string) => {
    setLoadingAttendeeDetails(true);
    try {
      const response = await fetch(`/api/venue/feedback/attendee/${attendeeId}`);
      if (!response.ok) throw new Error("Failed to load attendee details");
      const data = await response.json();
      setAttendeeDetails(data);
    } catch (error) {
      console.error("Error loading attendee details:", error);
      toastError("Failed to load attendee details", "Error");
    } finally {
      setLoadingAttendeeDetails(false);
    }
  };

  const handleAttendeeClick = (attendeeId: string | null | undefined) => {
    if (!attendeeId) return;
    setSelectedAttendeeId(attendeeId);
    loadAttendeeDetails(attendeeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl">
        <AlertCircle className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-secondary)]">No feedback data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="h-6 w-6 text-[var(--accent-secondary)]" />
            Venue Pulse
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            View and manage feedback from attendees across all your events
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setShowManualRequest(!showManualRequest);
            if (!showManualRequest && events.length === 0) {
              loadEvents();
            }
          }}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {showManualRequest ? "Hide" : "Send Request"}
        </Button>
      </div>

      {/* Manual Feedback Request - Collapsible */}
      {showManualRequest && (
        <div className="p-4 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl space-y-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Send Feedback Request
          </p>
          {loadingEvents ? (
            <div className="flex items-center gap-2 py-2">
              <LoadingSpinner size="sm" />
              <span className="text-xs text-[var(--text-secondary)]">Loading events...</span>
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">
              No past events found. Feedback requests can only be sent for events that have already occurred.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Event
                  </label>
                  <Select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    options={[
                      { value: "", label: "Choose an event..." },
                      ...events.map((event) => ({
                        value: event.id,
                        label: `${event.name} - ${new Date(event.start_time).toLocaleDateString()}`
                      }))
                    ]}
                  />
                </div>
                {selectedEventId && (
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                      Attendee
                    </label>
                    {loadingAttendees ? (
                      <div className="flex items-center gap-2 py-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-xs text-[var(--text-secondary)]">Loading...</span>
                      </div>
                    ) : attendees.length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)]">No checked-in attendees with email</p>
                    ) : (
                      <Select
                        value={selectedRegistrationId}
                        onChange={(e) => setSelectedRegistrationId(e.target.value)}
                        options={[
                          { value: "", label: "Choose an attendee..." },
                          ...attendees.map((attendee) => ({
                            value: attendee.registration_id,
                            label: `${attendee.name} ${attendee.email ? `(${attendee.email})` : ""}`
                          }))
                        ]}
                      />
                    )}
                  </div>
                )}
              </div>
              {selectedRegistrationId && (
                <Button
                  onClick={handleSendRequest}
                  disabled={sendingRequest}
                  loading={sendingRequest}
                  variant="primary"
                  size="sm"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send Request
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Stats Row - Compact chips */}
      <div className="flex flex-wrap gap-2">
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-lg font-bold text-[var(--text-primary)]">{stats.average_rating.toFixed(1)}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Avg Rating</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--text-primary)]">{stats.total_feedback}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--accent-warning)]">{stats.recent_feedback.filter((f) => !f.resolved_at).length}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Unresolved</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--accent-success)]">{stats.recent_feedback.filter((f) => f.resolved_at).length}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Resolved</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--text-secondary)]">{stats.events_with_feedback}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Events</span>
        </div>
      </div>

      {/* Rating Distribution - Compact bar chart */}
      <div className="p-3 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Rating Distribution</span>
        </div>
        <div className="flex items-end gap-2 h-10">
          {[1, 2, 3, 4, 5].map((rating) => {
            const count = stats.rating_distribution[rating.toString() as keyof typeof stats.rating_distribution];
            const maxCount = Math.max(...Object.values(stats.rating_distribution), 1);
            const heightPercent = (count / maxCount) * 100;
            
            return (
              <div key={rating} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex flex-col justify-end h-10">
                  <div
                    className={`w-full rounded-sm transition-all duration-300 ${
                      rating >= 4 ? "bg-[var(--accent-success)]" : 
                      rating === 3 ? "bg-[var(--accent-warning)]" : 
                      "bg-[var(--accent-error)]"
                    }`}
                    style={{ height: `${Math.max(heightPercent, count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">{rating}★</span>
                  <span className="text-[9px] font-mono text-[var(--text-secondary)]">({count})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent Feedback</span>
          <div className="flex items-center gap-1">
            {(["all", "unresolved", "resolved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  activeTab === tab
                    ? "bg-[var(--accent-primary)] text-[var(--bg-void)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[60px_70px_80px_1fr_1fr_80px_100px_80px] gap-2 px-3 py-1.5 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          <div>Rating</div>
          <div>Type</div>
          <div>Status</div>
          <div>Event</div>
          <div>Category</div>
          <div>Date</div>
          <div></div>
          <div></div>
        </div>

        {filteredFeedback.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">
              {activeTab === "all" 
                ? "No feedback yet" 
                : activeTab === "unresolved"
                ? "No unresolved feedback"
                : "No resolved feedback"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/50">
            {filteredFeedback.map((item) => (
              <FeedbackItemCard
                key={item.id}
                item={item}
                onUpdate={loadFeedback}
                onAttendeeClick={handleAttendeeClick}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)]">
          <p className="text-[10px] text-[var(--text-muted)] font-mono">
            {filteredFeedback.length} feedback items
          </p>
        </div>
      </div>

      {/* Attendee Detail Modal */}
      <Modal
        isOpen={!!selectedAttendeeId}
        onClose={() => {
          setSelectedAttendeeId(null);
          setAttendeeDetails(null);
        }}
        title="Attendee Details"
        size="lg"
      >
        {loadingAttendeeDetails ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : attendeeDetails ? (
          <div className="space-y-6">
            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-secondary mb-1">Name</p>
                  <p className="text-sm font-medium text-primary">{attendeeDetails.attendee.full_name}</p>
                </div>
                {attendeeDetails.attendee.email && (
                  <div>
                    <p className="text-xs text-secondary mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </p>
                    <a
                      href={`mailto:${attendeeDetails.attendee.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {attendeeDetails.attendee.email}
                    </a>
                  </div>
                )}
                {attendeeDetails.attendee.whatsapp && (
                  <div>
                    <p className="text-xs text-secondary mb-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      WhatsApp
                    </p>
                    <a
                      href={`https://wa.me/${attendeeDetails.attendee.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {attendeeDetails.attendee.whatsapp}
                    </a>
                  </div>
                )}
                {!attendeeDetails.attendee.email && !attendeeDetails.attendee.whatsapp && (
                  <p className="text-sm text-secondary">No contact information available</p>
                )}
              </div>
            </div>

            {/* History Tabs */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                History at This Venue
              </h3>
              <Tabs defaultValue="registrations">
                <TabsList>
                  <TabsTrigger value="registrations">
                    Registrations ({attendeeDetails.registrations.length})
                  </TabsTrigger>
                  <TabsTrigger value="feedback">
                    Feedback ({attendeeDetails.feedback.length})
                  </TabsTrigger>
                  <TabsTrigger value="checkins">
                    Check-ins ({attendeeDetails.checkins.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="registrations">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {attendeeDetails.registrations.length === 0 ? (
                      <p className="text-sm text-secondary text-center py-4">No registrations</p>
                    ) : (
                      attendeeDetails.registrations.map((reg: any) => (
                        <div key={reg.id} className="p-3 border border-border-subtle rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-primary">{reg.event_name}</p>
                              <p className="text-xs text-secondary">
                                {reg.event_date ? new Date(reg.event_date).toLocaleDateString() : "Date TBD"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {reg.checked_in ? (
                                <Badge variant="success" className="text-[10px]">Checked In</Badge>
                              ) : (
                                <Badge variant="default" className="text-[10px]">Not Checked In</Badge>
                              )}
                              <Link href={`/app/venue/events/${reg.event_id}`}>
                                <Button variant="ghost" size="sm">View</Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="feedback">
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {attendeeDetails.feedback.length === 0 ? (
                      <p className="text-sm text-secondary text-center py-4">No feedback submitted</p>
                    ) : (
                      attendeeDetails.feedback.map((fb: any) => (
                        <div key={fb.id} className="flex items-center gap-2 p-2 rounded border border-border-subtle bg-raised text-xs">
                          {/* Stars */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-2.5 w-2.5 ${
                                  star <= fb.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          {/* Type Badge */}
                          <Badge
                            variant={fb.feedback_type === "positive" ? "success" : "warning"}
                            className="text-[9px] px-1.5 py-0 flex-shrink-0"
                          >
                            {fb.feedback_type}
                          </Badge>
                          {/* Resolved Badge */}
                          {fb.resolved_at && (
                            <Badge variant="success" className="text-[9px] px-1.5 py-0 flex-shrink-0">
                              Resolved
                            </Badge>
                          )}
                          {/* Event Name */}
                          <span className="font-medium text-primary truncate flex-1 min-w-0">
                            {fb.event_name}
                          </span>
                          {/* Comment (if short) */}
                          {fb.comment && fb.comment.length < 40 && (
                            <span className="text-secondary truncate max-w-[120px]">
                              "{fb.comment}"
                            </span>
                          )}
                          {/* Date */}
                          <span className="text-[10px] text-secondary font-mono flex-shrink-0">
                            {fb.event_date
                              ? new Date(fb.event_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : new Date(fb.submitted_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                          </span>
                          {/* View Button */}
                          {fb.event_id && (
                            <Link href={`/app/venue/events/${fb.event_id}`}>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 flex-shrink-0">
                                View
                              </Button>
                            </Link>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="checkins">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {attendeeDetails.checkins.length === 0 ? (
                      <p className="text-sm text-secondary text-center py-4">No check-ins recorded</p>
                    ) : (
                      attendeeDetails.checkins.map((checkin: any) => (
                        <div key={checkin.id} className="p-3 border border-border-subtle rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-primary">{checkin.event_name}</p>
                              <p className="text-xs text-secondary">
                                {new Date(checkin.checked_in_at).toLocaleString()}
                              </p>
                            </div>
                            <Link href={`/app/venue/events/${checkin.event_id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-secondary">
            <p>Failed to load attendee details</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FeedbackItemCard({ 
  item, 
  onUpdate,
  onAttendeeClick
}: { 
  item: FeedbackItem; 
  onUpdate: () => void;
  onAttendeeClick: (attendeeId: string | null | undefined) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.internal_notes || "");
  const [saving, setSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleMarkResolved = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/venue/feedback/${item.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: !item.resolved_at }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feedback");
      }

      toastSuccess(item.resolved_at
        ? "Feedback marked as unresolved"
        : "Feedback marked as resolved", "Success");

      onUpdate();
    } catch (error) {
      toastError("Failed to update feedback", "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/venue/feedback/${item.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes");
      }

      toastSuccess("Internal notes saved", "Success");

      setShowNotes(false);
      onUpdate();
    } catch (error) {
      toastError("Failed to save notes", "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Grid row matching header */}
      <div 
        className="grid grid-cols-[60px_70px_80px_1fr_1fr_80px_100px_80px] gap-2 px-3 py-1.5 items-center hover:bg-[var(--bg-active)] transition-colors cursor-pointer"
        onClick={() => onAttendeeClick(item.attendee_id)}
      >
        {/* Rating - Stars */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-2.5 w-2.5 ${
                star <= item.rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Type Badge */}
        <div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
            item.feedback_type === "positive" 
              ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)]"
              : "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]"
          }`}>
            {item.feedback_type}
          </span>
        </div>

        {/* Status */}
        <div>
          {item.resolved_at ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-success)]/10 text-[var(--accent-success)] flex items-center gap-1 w-fit">
              <CheckCircle2 className="h-2.5 w-2.5" />
              resolved
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] flex items-center gap-1 w-fit">
              <XCircle className="h-2.5 w-2.5" />
              open
            </span>
          )}
        </div>

        {/* Event Name */}
        <div className="min-w-0">
          <Link 
            href={`/app/venue/events/${item.event_id}`}
            className="text-xs text-[var(--text-primary)] hover:underline truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {item.event_name}
          </Link>
        </div>

        {/* Category */}
        <div className="min-w-0">
          {item.categories.length > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-active)] text-[var(--text-secondary)] uppercase truncate block w-fit max-w-full">
              {item.categories[0].replace(/_/g, " ")}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">-</span>
          )}
        </div>

        {/* Date */}
        <div className="text-[10px] text-[var(--text-muted)] font-mono">
          {new Date(item.submitted_at).toLocaleDateString()}
        </div>

        {/* Resolve Action */}
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={item.resolved_at ? "ghost" : "primary"}
            onClick={handleMarkResolved}
            disabled={saving}
            loading={saving}
            className="h-6 text-[10px] px-2 w-full"
          >
            {item.resolved_at ? "Unresolve" : "Mark Resolved"}
          </Button>
        </div>

        {/* Notes Action */}
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNotes(!showNotes)}
            className="h-6 text-[10px] px-2 w-full"
          >
            {showNotes ? "Cancel" : item.internal_notes ? "Edit" : "Add Notes"}
          </Button>
        </div>
      </div>

      {/* Expandable notes section */}
      {showNotes && (
        <div className="px-3 py-2 bg-[var(--bg-raised)] border-t border-[var(--border-subtle)]">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes (not visible to attendees)..."
            className="w-full p-2 border border-[var(--border-subtle)] rounded text-xs bg-[var(--bg-glass)]"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveNotes}
              disabled={saving}
              loading={saving}
              className="h-6 text-[10px] px-3"
            >
              Save Notes
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowNotes(false);
                setNotes(item.internal_notes || "");
              }}
              className="h-6 text-[10px] px-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Internal notes display (when not editing) */}
      {item.internal_notes && !showNotes && (
        <div className="px-3 py-1.5 bg-blue-500/5 border-t border-blue-500/20 text-[10px] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Notes:</strong> {item.internal_notes}
        </div>
      )}
    </>
  );
}
