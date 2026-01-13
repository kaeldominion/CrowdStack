"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Modal, Textarea, Checkbox } from "@crowdstack/ui";
import { Calendar, Check, X, Clock, User, Star } from "lucide-react";
import Link from "next/link";

interface PendingEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status: string;
  created_at: string;
  organizer: {
    id: string;
    name: string;
    email: string | null;
  };
}

export default function VenuePendingEventsPage() {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Approval modal state
  const [approveModal, setApproveModal] = useState<{ 
    eventId: string; 
    eventName: string; 
    organizerName: string;
  } | null>(null);
  const [addToPreapproved, setAddToPreapproved] = useState(false);
  
  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{ eventId: string; eventName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadPendingEvents();
  }, []);

  const loadPendingEvents = async () => {
    try {
      const response = await fetch("/api/venue/events/pending");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load pending events");
      }
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error loading pending events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    
    setProcessingId(approveModal.eventId);
    try {
      const response = await fetch(`/api/venue/events/${approveModal.eventId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "approve",
          add_to_preapproved: addToPreapproved,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve event");
      }

      // Remove from list
      setEvents((prev) => prev.filter((e) => e.id !== approveModal.eventId));
      setApproveModal(null);
      setAddToPreapproved(false);
    } catch (error: any) {
      alert(error.message || "Failed to approve event");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    
    setProcessingId(rejectModal.eventId);
    try {
      const response = await fetch(`/api/venue/events/${rejectModal.eventId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "reject",
          rejection_reason: rejectionReason || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject event");
      }

      // Remove from list
      setEvents((prev) => prev.filter((e) => e.id !== rejectModal.eventId));
      setRejectModal(null);
      setRejectionReason("");
    } catch (error: any) {
      alert(error.message || "Failed to reject event");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading pending events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Clock className="h-6 w-6 text-[var(--accent-secondary)]" />
            Pending Approvals
          </h1>
          <p className="page-description">
            Review and approve events that organizers want to host at your venue
          </p>
        </div>
        <Link href="/app/venue/organizers/preapproved">
          <Button variant="secondary">
            <Star className="h-4 w-4 mr-2" />
            Manage Pre-approved
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">
              No Pending Approvals
            </h3>
            <p className="text-secondary">
              There are no events waiting for your approval right now.
            </p>
            <Link href="/app/venue/events">
              <Button variant="secondary" className="mt-4">
                View All Events
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-primary">
                      {event.name}
                    </h3>
                    <Badge variant="warning">Pending Approval</Badge>
                  </div>

                  <div className="space-y-2 text-sm text-secondary">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        Organizer: <strong>{event.organizer.name}</strong>
                        {event.organizer.email && ` (${event.organizer.email})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(event.start_time)}</span>
                      {event.end_time && (
                        <span>→ {formatDate(event.end_time)}</span>
                      )}
                    </div>
                    {event.description && (
                      <p className="mt-2 text-secondary line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="primary"
                    onClick={() => setApproveModal({ 
                      eventId: event.id, 
                      eventName: event.name,
                      organizerName: event.organizer.name,
                    })}
                    disabled={processingId === event.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectModal({ eventId: event.id, eventName: event.name })}
                    disabled={processingId === event.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        isOpen={!!approveModal}
        onClose={() => {
          setApproveModal(null);
          setAddToPreapproved(false);
        }}
        title="Approve Event"
      >
        <div className="space-y-4">
          <p className="text-secondary">
            You're about to approve <strong>{approveModal?.eventName}</strong> by{" "}
            <strong>{approveModal?.organizerName}</strong>.
          </p>

          <div className="p-4 bg-accent-secondary/5 border border-accent-secondary/20 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addToPreapproved}
                onChange={(e) => setAddToPreapproved(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="font-medium text-primary flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" />
                  Add to Pre-approved Organizers
                </span>
                <p className="text-sm text-secondary mt-1">
                  Future events from <strong>{approveModal?.organizerName}</strong> will be 
                  automatically approved. You'll still be notified when they create events.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setApproveModal(null);
                setAddToPreapproved(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              loading={!!processingId}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve Event
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectionReason("");
        }}
        title="Reject Event"
      >
        <div className="space-y-4">
          <p className="text-secondary">
            Are you sure you want to reject <strong>{rejectModal?.eventName}</strong>?
            The organizer will be notified.
          </p>

          <Textarea
            label="Reason for rejection (optional)"
            placeholder="Provide a reason to help the organizer understand..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectModal(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              loading={!!processingId}
            >
              Reject Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
