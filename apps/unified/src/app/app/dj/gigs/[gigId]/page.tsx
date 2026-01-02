"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Textarea, Badge } from "@crowdstack/ui";
import { ArrowLeft, Calendar, DollarSign, MapPin, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface GigPosting {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  payment_amount: number | null;
  payment_currency: string;
  show_payment: boolean;
  deadline: string | null;
  events: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    status: string;
    venues: {
      id: string;
      name: string;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    } | null;
  };
  organizers: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface Response {
  id: string;
  status: string;
  message: string | null;
  responded_at: string;
  confirmed_at: string | null;
}

export default function DJGigDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params.gigId as string;

  const [loading, setLoading] = useState(true);
  const [gig, setGig] = useState<GigPosting | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (gigId) {
      loadGigDetails();
    }
  }, [gigId]);

  const loadGigDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dj/gigs/${gigId}`);
      if (!response.ok) throw new Error("Failed to load gig");
      const data = await response.json();
      setGig(data.gig);
      setResponse(data.response);
      setInvitation(data.invitation);
      if (data.response?.message) {
        setMessage(data.response.message);
      }
    } catch (error) {
      console.error("Error loading gig:", error);
      alert("Failed to load gig details");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (status: "interested" | "declined") => {
    try {
      setResponding(true);
      const response = await fetch(`/api/dj/gigs/${gigId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          message: message.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit response");
      }

      const data = await response.json();
      setResponse(data.response);
      alert(status === "interested" ? "Response submitted! The organizer will review your application." : "Response submitted.");
      router.push("/app/dj/gigs/my-responses");
    } catch (error: any) {
      alert(error.message || "Failed to submit response");
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Gig not found</div>
      </div>
    );
  }

  const hasResponded = response !== null;
  const isConfirmed = response?.status === "confirmed";

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/app/dj/gigs">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gigs
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-primary">{gig.title}</h1>
          {invitation && <Badge variant="default">Invitation</Badge>}
          {hasResponded && (
            <Badge variant={response?.status === "confirmed" ? "success" : response?.status === "interested" ? "default" : "danger"}>
              {response?.status === "confirmed" ? "Confirmed" : response?.status === "interested" ? "Interested" : "Declined"}
            </Badge>
          )}
        </div>
        <div className="space-y-1 text-sm text-secondary">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {gig.events.name} • {formatDate(gig.events.start_time)}
            </span>
          </div>
          {gig.events.venues && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>
                {gig.events.venues.name}
                {gig.events.venues.address && `, ${gig.events.venues.address}`}
                {gig.events.venues.city && `, ${gig.events.venues.city}`}
                {gig.events.venues.state && `, ${gig.events.venues.state}`}
              </span>
            </div>
          )}
          {gig.show_payment && gig.payment_amount && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium text-primary">
                {formatCurrency(gig.payment_amount, gig.payment_currency)}
              </span>
            </div>
          )}
          {!gig.show_payment && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Price not disclosed</span>
            </div>
          )}
        </div>
      </div>

      {gig.description && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-primary mb-2">Description</h3>
          <p className="text-secondary whitespace-pre-wrap">{gig.description}</p>
        </Card>
      )}

      {gig.requirements && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-primary mb-2">Requirements</h3>
          <p className="text-secondary whitespace-pre-wrap">{gig.requirements}</p>
        </Card>
      )}

      {gig.deadline && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-primary mb-2">Response Deadline</h3>
          <p className="text-secondary">{formatDate(gig.deadline)}</p>
        </Card>
      )}

      {isConfirmed ? (
        <Card className="p-6 border-accent-success/50">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-accent-success" />
            <h3 className="text-xl font-semibold text-primary">You've been selected!</h3>
          </div>
          <p className="text-secondary mb-4">
            Congratulations! The organizer has selected you for this gig. You've been added to the event lineup.
          </p>
          {gig.events.status === "published" ? (
            <Link href={`/e/${gig.events.slug}`}>
              <Button>View Event</Button>
            </Link>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-secondary">
                The event page is not yet published. The organizer will share more details with you directly.
              </p>
              <p className="text-xs text-muted">
                Event ID: {gig.events.id}
              </p>
            </div>
          )}
        </Card>
      ) : hasResponded ? (
        <Card className="p-6">
          <h3 className="font-semibold text-primary mb-2">Your Response</h3>
          <p className="text-secondary mb-2">
            Status: <Badge variant={response?.status === "interested" ? "default" : "danger"}>{response?.status}</Badge>
          </p>
          {response?.message && (
            <div className="mt-4">
              <p className="text-sm font-medium text-primary mb-1">Your Message:</p>
              <p className="text-secondary">{response.message}</p>
            </div>
          )}
          <p className="text-xs text-secondary mt-4">
            Responded on {formatDate(response?.responded_at || "")}
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <h3 className="font-semibold text-primary mb-4">Respond to Gig</h3>
          <div className="space-y-4">
            <Textarea
              label="Message (Optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to the organizer..."
              rows={4}
            />
            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleRespond("interested")}
                loading={responding}
                disabled={responding}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                I'm Interested
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleRespond("declined")}
                loading={responding}
                disabled={responding}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

