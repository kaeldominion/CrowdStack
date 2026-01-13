"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, LoadingSpinner, useToast, Tabs, TabsList, TabsTrigger, TabsContent, Select, Modal } from "@crowdstack/ui";
import { Star, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, XCircle, Send, Mail, Phone, Calendar, User, History } from "lucide-react";
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
      <Card>
        <div className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-secondary mx-auto mb-4" />
          <p className="text-secondary">No feedback data available.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Venue Pulse</h1>
        <p className="text-sm text-secondary mt-2">
          View and manage feedback from attendees across all your events
        </p>
      </div>

      {/* Manual Feedback Request Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Feedback Request
              </h3>
              <p className="text-sm text-secondary mt-1">
                Manually send a feedback request email to a checked-in attendee. Emails are automatically logged to email_send_logs.
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
              {showManualRequest ? "Hide" : "Send Request"}
            </Button>
          </div>

          {showManualRequest && (
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              {loadingEvents ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-secondary">Loading events...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-secondary">
                    No past events found. Feedback requests can only be sent for events that have already occurred.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Select Event
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
                    <>
                      {loadingAttendees ? (
                        <div className="flex items-center justify-center py-4">
                          <LoadingSpinner size="sm" />
                          <span className="ml-2 text-sm text-secondary">Loading checked-in attendees...</span>
                        </div>
                      ) : attendees.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-secondary">
                            No checked-in attendees with email addresses found for this event.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Select Attendee
                            </label>
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
                            <p className="text-xs text-secondary mt-1">
                              Only checked-in attendees with email addresses are shown
                            </p>
                          </div>
                          <Button
                            onClick={handleSendRequest}
                            disabled={!selectedRegistrationId || sendingRequest}
                            loading={sendingRequest}
                            variant="primary"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Feedback Request
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-300">
                      <strong>Note:</strong> The feedback request email will be sent immediately and logged to the email management system (email_send_logs table). 
                      You can view email stats in the Email Stats tab.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Average Rating</span>
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.average_rating.toFixed(1)}
            </div>
            <div className="text-sm text-secondary mt-1">out of 5.0</div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Total Feedback</span>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.total_feedback}
            </div>
            <div className="text-sm text-secondary mt-1">
              from {stats.events_with_feedback} events
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Unresolved</span>
              <XCircle className="h-5 w-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.recent_feedback.filter((f) => !f.resolved_at).length}
            </div>
            <div className="text-sm text-secondary mt-1">needs attention</div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Resolved</span>
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.recent_feedback.filter((f) => f.resolved_at).length}
            </div>
            <div className="text-sm text-secondary mt-1">addressed</div>
          </div>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution[rating.toString() as keyof typeof stats.rating_distribution];
              const percentage = stats.total_feedback > 0 
                ? (count / stats.total_feedback) * 100 
                : 0;
              
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-secondary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-12 text-right">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Feedback List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Feedback</h3>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-secondary mx-auto mb-4" />
              <p className="text-secondary">
                {activeTab === "all" 
                  ? "No feedback yet" 
                  : activeTab === "unresolved"
                  ? "No unresolved feedback"
                  : "No resolved feedback"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
        </div>
      </Card>

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
    <div className="border border-border-subtle rounded-lg p-4 hover:bg-secondary/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= item.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <Badge
              variant={item.feedback_type === "positive" ? "success" : "warning"}
            >
              {item.feedback_type === "positive" ? "Positive" : "Negative"}
            </Badge>
            {item.resolved_at ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            ) : (
              <Badge variant="warning" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Unresolved
              </Badge>
            )}
            {item.attendee_name && (
              <button
                onClick={() => onAttendeeClick(item.attendee_id)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {item.attendee_name}
              </button>
            )}
            <Link 
              href={`/app/venue/events/${item.event_id}`}
              className="text-sm text-primary hover:underline"
            >
              {item.event_name}
            </Link>
            <span className="text-xs text-secondary">
              {new Date(item.submitted_at).toLocaleDateString()}
            </span>
          </div>

          {item.comment && (
            <p className="text-sm text-primary mb-2">{item.comment}</p>
          )}

          {item.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {item.categories.map((cat) => (
                <Badge key={cat} variant="outline" size="sm">
                  {cat.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}

          {item.free_text && (
            <p className="text-sm text-primary mb-2">{item.free_text}</p>
          )}

          {item.internal_notes && !showNotes && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
              <strong>Internal Notes:</strong> {item.internal_notes}
            </div>
          )}

          {showNotes && (
            <div className="mt-2 space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes (not visible to attendees)..."
                className="w-full p-2 border border-border-subtle rounded text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveNotes}
                  disabled={saving}
                  loading={saving}
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
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <Button
            size="sm"
            variant={item.resolved_at ? "secondary" : "primary"}
            onClick={handleMarkResolved}
            disabled={saving}
            loading={saving}
          >
            {item.resolved_at ? "Mark Unresolved" : "Mark Resolved"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? "Cancel" : item.internal_notes ? "Edit Notes" : "Add Notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
