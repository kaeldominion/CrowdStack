"use client";

import { useState, useEffect } from "react";
import { Button } from "@crowdstack/ui";
import { DollarSign, CheckCircle2, Loader2 } from "lucide-react";

interface PromoterRequestButtonProps {
  eventId: string;
  eventSlug: string;
}

export function PromoterRequestButton({ eventId, eventSlug }: PromoterRequestButtonProps) {
  const [isPromoter, setIsPromoter] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPromoterStatus();
  }, [eventId]);

  const checkPromoterStatus = async () => {
    try {
      // Use API route to check promoter status (avoids RLS 406 errors in console)
      const response = await fetch(`/api/me/promoter-status?eventId=${eventId}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      setIsPromoter(data.isPromoter);
      setIsAssigned(data.isAssigned);
    } catch {
      // Silently fail - component will just not render
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const response = await fetch(`/api/events/${eventId}/promoters/request`, {
        method: "POST",
      });

      if (response.ok) {
        setRequested(true);
        setIsAssigned(true);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to request promotion");
      }
    } catch (error) {
      console.error("Error requesting promotion:", error);
      alert("Failed to request promotion");
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading || !isPromoter) {
    return null;
  }

  if (isAssigned || requested) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>You're promoting this event</span>
        </div>
        <a
          href={`/app/promoter/tools`}
          className="mt-2 inline-flex items-center gap-1 text-xs text-green-400 hover:underline"
        >
          Generate your referral link
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <p className="text-xs text-foreground-muted mb-2">
        Earn money by promoting this event
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRequest}
        disabled={isRequesting}
        className="w-full"
      >
        {isRequesting ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            <DollarSign className="h-3 w-3 mr-2" />
            Help Promote This Event
          </>
        )}
      </Button>
    </div>
  );
}

