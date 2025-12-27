"use client";

import { useState, useEffect } from "react";
import { Button, InlineSpinner } from "@crowdstack/ui";
import { DollarSign, CheckCircle2, Clock, Send } from "lucide-react";

interface PromoterRequestButtonProps {
  eventId: string;
  eventSlug: string;
}

export function PromoterRequestButton({ eventId, eventSlug }: PromoterRequestButtonProps) {
  const [isPromoter, setIsPromoter] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"none" | "pending" | "declined" | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkPromoterStatus();
  }, [eventId]);

  const checkPromoterStatus = async () => {
    try {
      // Check promoter status
      const response = await fetch(`/api/me/promoter-status?eventId=${eventId}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      setIsPromoter(data.isPromoter);
      setIsAssigned(data.isAssigned);

      // If promoter but not assigned, check for existing request
      if (data.isPromoter && !data.isAssigned) {
        const reqResponse = await fetch("/api/promoter/requests");
        if (reqResponse.ok) {
          const reqData = await reqResponse.json();
          const existingRequest = reqData.requests?.find(
            (r: { event: { id: string }; status: string }) => 
              r.event?.id === eventId && (r.status === "pending" || r.status === "declined")
          );
          if (existingRequest) {
            setRequestStatus(existingRequest.status);
          } else {
            setRequestStatus("none");
          }
        }
      }
    } catch {
      // Silently fail - component will just not render
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = () => {
    setMessage("");
    setShowMessageModal(true);
  };

  const handleSubmitRequest = async () => {
    setIsRequesting(true);
    try {
      const response = await fetch("/api/promoter/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          message: message.trim() || null,
        }),
      });

      if (response.ok) {
        setRequestStatus("pending");
        setShowMessageModal(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error requesting promotion:", error);
      alert("Failed to submit request");
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading || !isPromoter) {
    return null;
  }

  // Already assigned as promoter
  if (isAssigned) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>You&apos;re promoting this event</span>
        </div>
        <a
          href="/app/promoter/tools"
          className="mt-2 inline-flex items-center gap-1 text-xs text-green-400 hover:underline"
        >
          Generate your referral link
        </a>
      </div>
    );
  }

  // Pending request
  if (requestStatus === "pending") {
    return (
      <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center gap-2 text-sm text-yellow-400">
          <Clock className="h-4 w-4" />
          <span>Request pending approval</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          The event organizer will review your request
        </p>
      </div>
    );
  }

  // Declined request
  if (requestStatus === "declined") {
    return (
      <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <span>Request was declined</span>
        </div>
      </div>
    );
  }

  // No request yet - show request button
  return (
    <>
      <div className="mt-4 p-3 rounded-lg bg-accent-secondary/5 border border-accent-secondary/20">
        <p className="text-xs text-secondary mb-2">
          Want to earn money promoting this event?
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRequestClick}
          className="w-full"
        >
          <Send className="h-3 w-3 mr-2" />
          Request to Promote
        </Button>
      </div>

      {/* Request Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Request to Promote
            </h3>

            <p className="text-sm text-gray-400">
              Send a request to the event organizer. They&apos;ll review your profile and may contact you to discuss terms.
            </p>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself, share your experience, or explain why you'd be great for this event..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowMessageModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={isRequesting}
                className="flex-1"
              >
                {isRequesting ? (
                  <>
                    <InlineSpinner size="xs" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
