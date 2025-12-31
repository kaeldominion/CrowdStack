"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, LoadingSpinner, Card } from "@crowdstack/ui";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { CloseoutWizard } from "@/components/closeout/CloseoutWizard";

interface Event {
  id: string;
  name: string;
  status: string;
  closed_at: string | null;
}

export default function EventCloseoutPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      }
    } catch (error) {
      console.error("Failed to load event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    // Reload event to show closed status
    loadEvent();
    // Optionally redirect after a delay
    setTimeout(() => {
      router.push(`/app/organizer/events/${eventId}`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading event..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <Link href={`/app/organizer/events/${eventId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
        </Link>
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary">Event not found</p>
          </div>
        </Card>
      </div>
    );
  }

  const isClosed = event.status === "closed" || event.closed_at !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/app/organizer/events/${eventId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">Event Closeout</h1>
            <p className="text-sm text-secondary mt-1">{event.name}</p>
          </div>
        </div>
      </div>

      {isClosed ? (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-primary/10 border border-accent-primary/30">
              <AlertCircle className="h-5 w-5 text-accent-primary" />
              <div>
                <h3 className="font-semibold text-primary">Event Already Closed</h3>
                <p className="text-sm text-secondary mt-1">
                  This event has already been closed. Payouts have been finalized
                  and cannot be modified.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <Link href={`/app/organizer/payouts`}>
                <Button variant="primary">View Payouts</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Close Event & Finalize Payouts
              </h3>
              <p className="text-sm text-secondary">
                Review check-ins, calculate payouts, and finalize the event. Once
                closed, check-ins will be locked and payout statements will be
                generated.
              </p>
            </div>

            <div className="pt-4">
              <Button variant="primary" onClick={() => setShowWizard(true)}>
                Start Closeout Process
              </Button>
            </div>
          </div>
        </Card>
      )}

      <CloseoutWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        eventId={eventId}
        eventName={event.name}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

