"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@crowdstack/ui";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  Building2,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
  EyeOff,
  QrCode,
  Radio,
} from "lucide-react";
import Link from "next/link";

interface EventData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  cover_image_url: string | null;
  promoter_access_type: string;
  organizer_id: string;
  venue_id: string | null;
  venue_approval_status: string | null;
  venue_approval_at: string | null;
  venue_approval_by: string | null;
  venue_rejection_reason: string | null;
  created_at: string;
  organizer?: { id: string; name: string; email: string | null };
  venue?: { id: string; name: string; address: string | null; city: string | null };
  event_promoters?: Array<{
    id: string;
    promoter: { id: string; name: string; email: string | null } | null;
    commission_type: string;
    commission_config: any;
  }>;
}

interface Stats {
  registrations_count: number;
  checkins_count: number;
}

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approving, setApproving] = useState(false);
  
  // Publish state
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to load event");
      }
      const data = await response.json();
      setEvent(data.event);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!event) return;

    setApproving(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approvalAction,
          rejection_reason: approvalAction === "reject" ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process approval");
      }

      // Reload event data
      await loadEvent();
      setShowApprovalModal(false);
      setRejectionReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setApproving(false);
    }
  };

  const openApprovalModal = (action: "approve" | "reject") => {
    setApprovalAction(action);
    setRejectionReason("");
    setShowApprovalModal(true);
  };

  const handlePublishToggle = async () => {
    if (!event) return;

    setPublishing(true);
    try {
      const newStatus = event.status === "published" ? "draft" : "published";
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event status");
      }

      // Reload event data
      await loadEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPublishing(false);
    }
  };

  const getApprovalStatusBadge = () => {
    if (!event?.venue_id) {
      return <Badge variant="default">No Venue</Badge>;
    }

    switch (event.venue_approval_status) {
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Venue Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <ShieldX className="h-3 w-3" />
            Venue Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Pending Approval
          </Badge>
        );
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getEventStatusBadge = () => {
    switch (event?.status) {
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "draft":
        return <Badge variant="warning">Draft</Badge>;
      case "ended":
        return <Badge variant="default">Ended</Badge>;
      default:
        return <Badge>{event?.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-danger" />
        <div className="text-foreground-muted">{error || "Event not found"}</div>
        <Link href="/admin/events">
          <Button variant="secondary">Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/events" className="inline-flex items-center text-sm text-foreground-muted hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
              {getEventStatusBadge()}
              {getApprovalStatusBadge()}
            </div>
            {event.slug && (
              <div className="flex items-center gap-4">
                <a
                  href={`/e/${event.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View Public Page <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={`/door/${event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <QrCode className="h-3 w-3" /> Door Scanner
                </a>
                <a
                  href={`/app/organizer/live/${event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Radio className="h-3 w-3" /> Live Control
                </a>
              </div>
            )}
          </div>

          {/* Approval & Publish Actions */}
          <div className="flex items-center gap-2">
            {/* Venue Approval Actions */}
            {event.venue_id && (
              <>
                {event.venue_approval_status !== "approved" && (
                  <Button
                    variant="primary"
                    onClick={() => openApprovalModal("approve")}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Approve Event
                  </Button>
                )}
                {event.venue_approval_status !== "rejected" && (
                  <Button
                    variant="secondary"
                    onClick={() => openApprovalModal("reject")}
                  >
                    <ShieldX className="h-4 w-4 mr-2" />
                    Reject Event
                  </Button>
                )}
              </>
            )}
            
            {/* Publish/Unpublish Action */}
            {event.status === "published" ? (
              <Button
                variant="secondary"
                onClick={handlePublishToggle}
                disabled={publishing}
                loading={publishing}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish Event
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handlePublishToggle}
                disabled={publishing}
                loading={publishing}
              >
                <Globe className="h-4 w-4 mr-2" />
                Publish Event
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Event Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-foreground-muted mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {new Date(event.start_time).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm text-foreground-muted">
                  {new Date(event.start_time).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {event.end_time && (
                    <> - {new Date(event.end_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</>
                  )}
                </p>
              </div>
            </div>

            {event.venue && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-foreground-muted mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{event.venue.name}</p>
                  <p className="text-sm text-foreground-muted">
                    {[event.venue.address, event.venue.city].filter(Boolean).join(", ") || "No address"}
                  </p>
                </div>
              </div>
            )}

            {event.organizer && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-foreground-muted mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{event.organizer.name}</p>
                  <p className="text-sm text-foreground-muted">{event.organizer.email || "Organizer"}</p>
                </div>
              </div>
            )}

            {event.capacity && (
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-foreground-muted mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Capacity: {event.capacity}</p>
                </div>
              </div>
            )}

            {event.description && (
              <div className="pt-4 border-t border-border">
                <p className="text-foreground-muted whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stats & Approval Info */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground-muted">Registrations</span>
                <span className="text-2xl font-bold text-foreground">{stats?.registrations_count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground-muted">Check-ins</span>
                <span className="text-2xl font-bold text-foreground">{stats?.checkins_count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground-muted">Promoters</span>
                <span className="text-2xl font-bold text-foreground">{event.event_promoters?.length || 0}</span>
              </div>
            </div>
          </Card>

          {/* Approval Status */}
          {event.venue_id && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Venue Approval</h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-foreground-muted">Status:</span>
                  {getApprovalStatusBadge()}
                </div>

                {event.venue_approval_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-foreground-muted" />
                    <span className="text-sm text-foreground-muted">
                      {new Date(event.venue_approval_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {event.venue_rejection_reason && (
                  <div className="p-3 rounded-md bg-danger/10 border border-danger/20">
                    <p className="text-sm text-danger font-medium mb-1">Rejection Reason:</p>
                    <p className="text-sm text-foreground-muted">{event.venue_rejection_reason}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Promoters */}
          {event.event_promoters && event.event_promoters.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Promoters</h2>
              <div className="space-y-2">
                {event.event_promoters.map((ep) => (
                  <div key={ep.id} className="flex justify-between items-center text-sm">
                    <span className="text-foreground">{ep.promoter?.name || "Unknown"}</span>
                    <Badge variant="default" className="text-xs">
                      {ep.commission_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={approvalAction === "approve" ? "Approve Event" : "Reject Event"}
      >
        <div className="space-y-4">
          {approvalAction === "approve" ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Approve this event?</p>
                <p className="text-sm text-foreground-muted mt-1">
                  Both the venue admins and the event organizer will be notified of this approval.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20">
                <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Reject this event?</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    Both the venue admins and the event organizer will be notified of this rejection.
                  </p>
                </div>
              </div>
              <Textarea
                label="Rejection Reason (optional)"
                placeholder="Explain why this event is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowApprovalModal(false)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              variant={approvalAction === "approve" ? "primary" : "destructive"}
              onClick={handleApproval}
              disabled={approving}
              loading={approving}
            >
              {approvalAction === "approve" ? "Approve Event" : "Reject Event"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

