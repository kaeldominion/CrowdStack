"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Badge } from "@crowdstack/ui";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Calendar, DollarSign, MapPin } from "lucide-react";
import Link from "next/link";

interface GigResponse {
  id: string;
  status: string;
  message: string | null;
  responded_at: string;
  confirmed_at: string | null;
  djs: {
    id: string;
    handle: string;
    name: string;
    profile_image_url: string | null;
    genres: string[] | null;
    location: string | null;
  };
}

interface GigPosting {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  payment_amount: number | null;
  payment_currency: string;
  show_payment: boolean;
  status: string;
  posting_type: string;
  deadline: string | null;
  events: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    venues: {
      id: string;
      name: string;
    } | null;
  };
  organizers: {
    id: string;
    name: string;
  };
}

export default function GigDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params.gigId as string;

  const [loading, setLoading] = useState(true);
  const [gig, setGig] = useState<GigPosting | null>(null);
  const [responses, setResponses] = useState<GigResponse[]>([]);
  const [selectingDjId, setSelectingDjId] = useState<string | null>(null);

  useEffect(() => {
    if (gigId) {
      loadGigDetails();
    }
  }, [gigId]);

  const loadGigDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/gigs/${gigId}`);
      if (!response.ok) throw new Error("Failed to load gig");
      const data = await response.json();
      setGig(data.gig);
      setResponses(data.responses || []);
    } catch (error) {
      console.error("Error loading gig:", error);
      alert("Failed to load gig details");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDJ = async (djId: string) => {
    if (!confirm("Confirm selection of this DJ? They will be added to the lineup and payment will be set up.")) {
      return;
    }

    try {
      setSelectingDjId(djId);
      const response = await fetch(`/api/organizer/gigs/${gigId}/select-dj`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dj_id: djId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to select DJ");
      }

      alert("DJ selected successfully! They have been added to the lineup.");
      router.push(`/app/organizer/events/${gig?.events.id}`);
    } catch (error: any) {
      alert(error.message || "Failed to select DJ");
    } finally {
      setSelectingDjId(null);
      loadGigDetails();
    }
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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

  const interestedResponses = responses.filter((r) => r.status === "interested");
  const confirmedResponses = responses.filter((r) => r.status === "confirmed");
  const declinedResponses = responses.filter((r) => r.status === "declined");

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/app/organizer/gigs">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gigs
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-primary">{gig.title}</h1>
          <Badge variant={gig.status === "filled" ? "success" : "default"}>
            {gig.status}
          </Badge>
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
              <span>{gig.events.venues.name}</span>
            </div>
          )}
          {gig.show_payment && gig.payment_amount && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>{formatCurrency(gig.payment_amount, gig.payment_currency)}</span>
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

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Responses ({responses.length})
        </h2>

        {confirmedResponses.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent-success" />
              Confirmed ({confirmedResponses.length})
            </h3>
            <div className="space-y-4">
              {confirmedResponses.map((response) => (
                <Card key={response.id} className="p-6 border-accent-success/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {response.djs.profile_image_url && (
                        <img
                          src={response.djs.profile_image_url}
                          alt={response.djs.name}
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary">{response.djs.name}</h4>
                        <p className="text-sm text-secondary">@{response.djs.handle}</p>
                        {response.djs.location && (
                          <p className="text-sm text-secondary mt-1">📍 {response.djs.location}</p>
                        )}
                        {response.message && (
                          <p className="text-sm text-secondary mt-2">{response.message}</p>
                        )}
                        <p className="text-xs text-secondary mt-2">
                          Confirmed {formatDate(response.confirmed_at || response.responded_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">Confirmed</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {interestedResponses.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary mb-3">
              Interested ({interestedResponses.length})
            </h3>
            <div className="space-y-4">
              {interestedResponses.map((response) => (
                <Card key={response.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {response.djs.profile_image_url && (
                        <img
                          src={response.djs.profile_image_url}
                          alt={response.djs.name}
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary">{response.djs.name}</h4>
                        <p className="text-sm text-secondary">@{response.djs.handle}</p>
                        {response.djs.location && (
                          <p className="text-sm text-secondary mt-1">📍 {response.djs.location}</p>
                        )}
                        {response.djs.genres && response.djs.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {response.djs.genres.slice(0, 3).map((genre, idx) => (
                              <Badge key={idx} variant="default" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {response.message && (
                          <div className="mt-3 p-3 bg-surface-hover rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="w-4 h-4 text-secondary" />
                              <span className="text-sm font-medium text-primary">Message</span>
                            </div>
                            <p className="text-sm text-secondary">{response.message}</p>
                          </div>
                        )}
                        <p className="text-xs text-secondary mt-2">
                          Responded {formatDate(response.responded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleSelectDJ(response.djs.id)}
                        loading={selectingDjId === response.djs.id}
                        disabled={gig.status === "filled"}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Select DJ
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {declinedResponses.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-secondary" />
              Declined ({declinedResponses.length})
            </h3>
            <div className="space-y-2">
              {declinedResponses.map((response) => (
                <Card key={response.id} className="p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    {response.djs.profile_image_url && (
                      <img
                        src={response.djs.profile_image_url}
                        alt={response.djs.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <span className="font-medium text-primary">{response.djs.name}</span>
                      <span className="text-sm text-secondary ml-2">@{response.djs.handle}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {responses.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-secondary">No responses yet</p>
          </Card>
        )}
      </div>
    </div>
  );
}

