"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, LoadingSpinner, useToast, Select } from "@crowdstack/ui";
import { Star, TrendingUp, AlertCircle, MessageSquare, Send, CheckCircle2, XCircle, RotateCcw, StickyNote } from "lucide-react";

interface FeedbackItem {
  id: string;
  rating: number;
  feedback_type: "positive" | "negative";
  comment?: string | null;
  categories: string[];
  free_text?: string | null;
  submitted_at: string;
  attendee_name?: string | null;
  resolved_at?: string | null;
  internal_notes?: string | null;
}

interface EventFeedbackStats {
  event_id: string;
  event_name: string;
  event_date?: string;
  total_feedback: number;
  average_rating: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  positive_count: number;
  negative_count: number;
  category_breakdown: Record<string, number>;
  feedback_items: FeedbackItem[];
}

interface VenueFeedbackPanelProps {
  eventId: string;
}

interface CheckedInAttendee {
  registration_id: string;
  attendee_id: string;
  name: string;
  email: string | null;
  checked_in: boolean;
}

export function VenueFeedbackPanel({ eventId }: VenueFeedbackPanelProps) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<EventFeedbackStats | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showTestSection, setShowTestSection] = useState(false);
  const [testAttendees, setTestAttendees] = useState<CheckedInAttendee[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>("");
  const [sendingTest, setSendingTest] = useState(false);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const response = await fetch(`/api/venue/events/${eventId}/feedback`);
        if (!response.ok) {
          throw new Error("Failed to load feedback");
        }
        const data = await response.json();
        setFeedback(data.feedback);
      } catch (error) {
        console.error("Error loading feedback:", error);
        toastError("Failed to load feedback data.", "Error");
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, [eventId]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const loadTestAttendees = async () => {
    setLoadingAttendees(true);
    try {
      const response = await fetch(`/api/venue/events/${eventId}/feedback/test-attendees`);
      if (!response.ok) {
        throw new Error("Failed to load attendees");
      }
      const data = await response.json();
      setTestAttendees(data.attendees || []);
    } catch (error) {
      console.error("Error loading attendees:", error);
      toastError("Failed to load attendees.", "Error");
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleSendTest = async () => {
    if (!selectedRegistrationId) {
      toastError("Please select an attendee", "Error");
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch(`/api/venue/events/${eventId}/feedback/send-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationId: selectedRegistrationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send feedback request");
      }

      const data = await response.json();
      toastSuccess(`Feedback request email sent to ${data.attendee.email}. The email has been logged to email_send_logs.`, "Feedback Request Sent");
      setSelectedRegistrationId("");
    } catch (error: any) {
      console.error("Error sending feedback request:", error);
      toastError(error.message || "Failed to send feedback request", "Error");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <Card>
        <div className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-secondary mx-auto mb-4" />
          <p className="text-secondary">No feedback data available.</p>
        </div>
      </Card>
    );
  }

  if (feedback.total_feedback === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <MessageSquare className="h-12 w-12 text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
          <p className="text-secondary">
            Feedback will appear here once attendees submit their responses.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                setShowTestSection(!showTestSection);
                if (!showTestSection && testAttendees.length === 0) {
                  loadTestAttendees();
                }
              }}
            >
              {showTestSection ? "Hide" : "Send Request"}
            </Button>
          </div>

          {showTestSection && (
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              {loadingAttendees ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-secondary">Loading checked-in attendees...</span>
                </div>
              ) : testAttendees.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-secondary">
                    No checked-in attendees with email addresses found.
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
                        ...testAttendees.map((attendee) => ({
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
                    onClick={handleSendTest}
                    disabled={!selectedRegistrationId || sendingTest}
                    loading={sendingTest}
                    variant="primary"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback Request
                  </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Average Rating</span>
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {feedback.average_rating.toFixed(1)}
            </div>
            <div className="text-sm text-secondary mt-1">
              out of 5.0
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Total Feedback</span>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {feedback.total_feedback}
            </div>
            <div className="text-sm text-secondary mt-1">
              {feedback.positive_count} positive, {feedback.negative_count} negative
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Response Rate</span>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {feedback.total_feedback}
            </div>
            <div className="text-sm text-secondary mt-1">
              responses received
            </div>
          </div>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = feedback.rating_distribution[rating.toString() as keyof typeof feedback.rating_distribution];
              const percentage = feedback.total_feedback > 0 
                ? (count / feedback.total_feedback) * 100 
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

      {/* Category Breakdown (for negative feedback) */}
      {Object.keys(feedback.category_breakdown).length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Areas for Improvement</h3>
            <div className="space-y-2">
              {Object.entries(feedback.category_breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-secondary capitalize">
                      {category.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      {/* Individual Feedback Items */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Individual Feedback</h3>
          <div className="space-y-4">
            {feedback.feedback_items.map((item) => (
              <FeedbackItemCard
                key={item.id}
                item={item}
                eventId={eventId}
                onUpdate={() => {
                  // Reload feedback
                  const loadFeedback = async () => {
                    try {
                      const response = await fetch(`/api/venue/events/${eventId}/feedback`);
                      if (!response.ok) {
                        throw new Error("Failed to load feedback");
                      }
                      const data = await response.json();
                      setFeedback(data.feedback);
                    } catch (error) {
                      console.error("Error loading feedback:", error);
                    }
                  };
                  loadFeedback();
                }}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function FeedbackItemCard({ 
  item, 
  eventId,
  onUpdate 
}: { 
  item: FeedbackItem; 
  eventId: string;
  onUpdate: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.internal_notes || "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
              <span className="text-sm text-secondary">
                from {item.attendee_name}
              </span>
            )}
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
            <div>
              {expanded ? (
                <p className="text-sm text-primary">{item.free_text}</p>
              ) : (
                <p className="text-sm text-primary line-clamp-2">
                  {item.free_text}
                </p>
              )}
              {item.free_text.length > 100 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1"
                >
                  {expanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
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

        <div className="flex flex-col gap-1.5 ml-2">
          <button
            className={`p-2 rounded-lg transition-colors ${
              item.resolved_at 
                ? "bg-[var(--bg-raised)] hover:bg-[var(--bg-glass)] text-[var(--text-muted)]" 
                : "bg-[var(--accent-success)]/10 hover:bg-[var(--accent-success)]/20 text-[var(--accent-success)]"
            } disabled:opacity-50`}
            onClick={handleMarkResolved}
            disabled={saving}
            title={item.resolved_at ? "Mark as unresolved" : "Mark as resolved"}
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : item.resolved_at ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              showNotes 
                ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" 
                : "bg-[var(--bg-raised)] hover:bg-[var(--bg-glass)] text-[var(--text-muted)]"
            }`}
            onClick={() => setShowNotes(!showNotes)}
            title={showNotes ? "Cancel" : item.internal_notes ? "Edit notes" : "Add notes"}
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
