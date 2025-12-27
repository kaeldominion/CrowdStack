"use client";

import { useState, useEffect } from "react";
import { Button, Badge, LoadingSpinner } from "@crowdstack/ui";
import { 
  Users, Calendar, MapPin, Clock, Check, X, Loader2, 
  MessageSquare, Mail, Phone, ChevronDown, ChevronUp,
  DollarSign, ExternalLink
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PromoterRequest {
  id: string;
  message: string | null;
  status: "pending" | "approved" | "declined" | "withdrawn";
  response_message: string | null;
  created_at: string;
  responded_at: string | null;
  event: {
    id: string;
    name: string;
    slug: string;
    flier_url: string | null;
    start_time: string;
    venue: { id: string; name: string } | null;
  } | null;
  promoter: {
    id: string;
    name: string | null;
    email: string | null;
    user_id: string | null;
  } | null;
}

export default function PromoterRequestsPage() {
  const [requests, setRequests] = useState<PromoterRequest[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "declined">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "approve" | "decline" } | null>(null);

  const loadRequests = async () => {
    try {
      const response = await fetch("/api/organizer/promoter-requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setCounts(data.counts || { pending: 0, approved: 0, declined: 0, total: 0 });
      }
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = (id: string, action: "approve" | "decline") => {
    setPendingAction({ id, action });
    setResponseMessage("");
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!pendingAction) return;

    setRespondingId(pendingAction.id);
    try {
      const response = await fetch("/api/organizer/promoter-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: pendingAction.id,
          action: pendingAction.action,
          response_message: responseMessage.trim() || null,
          commission_type: "per_head",
          commission_config: { amount: 0 }, // Default - can be configured later
        }),
      });

      if (response.ok) {
        await loadRequests();
        setShowResponseModal(false);
        setPendingAction(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to respond to request");
      }
    } catch (error) {
      console.error("Failed to respond:", error);
      alert("Failed to respond to request");
    } finally {
      setRespondingId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const filteredRequests = filter === "all" 
    ? requests 
    : requests.filter(r => r.status === filter);

  const getPromoterDisplayName = (promoter: PromoterRequest["promoter"]) => {
    if (!promoter) return "Unknown Promoter";
    // Check if name looks like a UUID
    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(promoter.name || "");
    if (promoter.name && !isUuidLike) return promoter.name;
    if (promoter.email) return promoter.email.split("@")[0];
    return "Unknown Promoter";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Promoter Requests</h1>
            <p className="text-secondary mt-1">
              Manage requests from promoters who want to promote your events
            </p>
          </div>
          {counts.pending > 0 && (
            <Badge variant="default" className="bg-accent-warning/20 text-accent-warning px-3 py-1">
              {counts.pending} pending
            </Badge>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 bg-glass p-1 rounded-lg w-fit">
          {[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "approved", label: "Approved", count: counts.approved },
            { value: "declined", label: "Declined", count: counts.declined },
            { value: "all", label: "All", count: counts.total },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filter === tab.value
                  ? "bg-active text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-glass rounded-xl border border-border-subtle">
            <Users className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-secondary">
              {filter === "pending" 
                ? "No pending requests" 
                : `No ${filter === "all" ? "" : filter + " "}requests`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-glass border border-border-subtle rounded-xl overflow-hidden"
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Promoter Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-primary/30 via-accent-secondary/30 to-accent-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {getPromoterDisplayName(request.promoter).charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-primary">
                            {getPromoterDisplayName(request.promoter)}
                          </h3>
                          {request.promoter?.email && (
                            <p className="text-sm text-secondary">{request.promoter.email}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            request.status === "pending"
                              ? "secondary"
                              : request.status === "approved"
                              ? "success"
                              : "danger"
                          }
                          className={
                            request.status === "pending"
                              ? "bg-accent-warning/20 text-accent-warning"
                              : request.status === "approved"
                              ? "bg-accent-success/20 text-accent-success"
                              : "bg-accent-error/20 text-accent-error"
                          }
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>

                      {/* Event Info */}
                      <div className="flex items-center gap-3 mt-3 text-sm text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span className="line-clamp-1">
                            {request.event?.name || "Unknown Event"}
                          </span>
                        </div>
                        {request.event?.venue && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span>{request.event.venue.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Request Message Preview */}
                      {request.message && (
                        <p className="mt-2 text-sm text-primary line-clamp-2">
                          &ldquo;{request.message}&rdquo;
                        </p>
                      )}

                      {/* Timestamp */}
                      <p className="mt-2 text-xs text-muted">
                        Requested {formatDate(request.created_at)}
                        {request.responded_at && (
                          <> · Responded {formatDate(request.responded_at)}</>
                        )}
                      </p>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                      className="p-2 text-secondary hover:text-primary transition-colors"
                    >
                      {expandedId === request.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Actions for Pending */}
                  {request.status === "pending" && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle">
                      <Button
                        onClick={() => handleAction(request.id, "approve")}
                        disabled={respondingId === request.id}
                        className="bg-accent-success hover:bg-accent-success/90"
                      >
                        {respondingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleAction(request.id, "decline")}
                        disabled={respondingId === request.id}
                        className="border border-accent-error/50 text-accent-error hover:bg-accent-error/10"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                      {request.promoter?.email && (
                        <a
                          href={`mailto:${request.promoter.email}`}
                          className="ml-auto flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
                        >
                          <Mail className="h-4 w-4" />
                          Contact
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === request.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border-subtle mt-0 space-y-4">
                    {/* Full Message */}
                    {request.message && (
                      <div className="bg-glass rounded-lg p-3">
                        <p className="text-xs text-muted mb-1">Promoter&apos;s Message</p>
                        <p className="text-sm text-primary">{request.message}</p>
                      </div>
                    )}

                    {/* Response Message */}
                    {request.response_message && (
                      <div className="bg-glass rounded-lg p-3">
                        <p className="text-xs text-muted mb-1">Your Response</p>
                        <p className="text-sm text-primary">{request.response_message}</p>
                      </div>
                    )}

                    {/* Event Link */}
                    {request.event && (
                      <div className="flex items-center gap-3">
                        {request.event.flier_url && (
                          <Image
                            src={request.event.flier_url}
                            alt=""
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-primary font-medium">{request.event.name}</p>
                          {request.event.start_time && (
                            <p className="text-xs text-secondary">
                              {formatDate(request.event.start_time)}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/app/organizer/events/${request.event.id}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          View Event <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {showResponseModal && pendingAction && (
        <div className="fixed inset-0 bg-void/60 backdrop-blur-glass flex items-center justify-center z-50 p-4">
          <div className="bg-raised border border-border-strong rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-semibold text-primary">
              {pendingAction.action === "approve" ? "Approve Request" : "Decline Request"}
            </h3>

            <p className="text-secondary text-sm">
              {pendingAction.action === "approve"
                ? "The promoter will be added to your event. You can configure their commission in the event settings."
                : "The promoter will be notified that their request was declined."}
            </p>

            <div>
              <label className="block text-sm text-secondary mb-2">
                Message to promoter (optional)
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  pendingAction.action === "approve"
                    ? "Welcome aboard! Looking forward to working with you..."
                    : "Thanks for your interest, but we're not looking for promoters at this time..."
                }
                className="w-full h-24 bg-raised border border-border-subtle rounded-lg p-3 text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResponseModal(false);
                  setPendingAction(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitResponse}
                disabled={respondingId !== null}
                className={`flex-1 ${
                  pendingAction.action === "approve"
                    ? "bg-accent-success hover:bg-accent-success/90"
                    : "bg-accent-error hover:bg-accent-error/90"
                }`}
              >
                {respondingId ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : pendingAction.action === "approve" ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {pendingAction.action === "approve" ? "Approve" : "Decline"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

