"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@crowdstack/ui";
import { Calendar, DollarSign, MapPin, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";

interface Response {
  id: string;
  dj_id: string;
  dj_profile?: {
    id: string;
    name: string;
    handle: string;
  };
  status: string;
  message: string | null;
  responded_at: string;
  confirmed_at: string | null;
  gig: {
    id: string;
    title: string;
    payment_amount: number | null;
    payment_currency: string;
    show_payment: boolean;
    event: {
      id: string;
      name: string;
      slug: string;
      start_time: string;
      venues: {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
      } | null;
    };
    organizer: {
      id: string;
      name: string;
    };
  };
}

export default function MyResponsesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Response[]>([]);

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dj/gigs/my-responses");
      if (!response.ok) throw new Error("Failed to load responses");
      const data = await response.json();
      setResponses(data.responses || []);
    } catch (error) {
      console.error("Error loading responses:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    if (status === "confirmed") return <CheckCircle2 className="w-5 h-5 text-accent-success" />;
    if (status === "interested") return <Clock className="w-5 h-5 text-accent-primary" />;
    return <XCircle className="w-5 h-5 text-secondary" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return <Badge variant="success">Confirmed</Badge>;
    }
    if (status === "interested") {
      return <Badge variant="default">Pending</Badge>;
    }
    return <Badge variant="danger">Declined</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const confirmed = responses.filter((r) => r.status === "confirmed");
  const pending = responses.filter((r) => r.status === "interested");
  const declined = responses.filter((r) => r.status === "declined");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">My Gig Responses</h1>
        <p className="text-secondary">Track your gig applications and bookings</p>
      </div>

      {responses.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold text-primary mb-2">No responses yet</h3>
          <p className="text-secondary mb-6">
            Start applying to gigs to see your responses here
          </p>
          <Link href="/app/dj/gigs">
            <Button>Browse Gigs</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {confirmed.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                {getStatusIcon("confirmed")}
                Confirmed ({confirmed.length})
              </h2>
              <div className="grid gap-4">
                {confirmed.map((response) => (
                  <Card key={response.id} className="p-6 border-accent-success/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-semibold text-primary">{response.gig.title}</h3>
                          {getStatusBadge(response.status)}
                          {response.dj_profile && (
                            <Badge variant="outline" className="text-xs">
                              {response.dj_profile.name}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-secondary mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {response.gig.event.name} • {formatDate(response.gig.event.start_time)}
                            </span>
                          </div>
                          {response.gig.event.venues && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {response.gig.event.venues.name}
                                {response.gig.event.venues.city && `, ${response.gig.event.venues.city}`}
                              </span>
                            </div>
                          )}
                          {response.gig.show_payment && response.gig.payment_amount && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium text-primary">
                                {formatCurrency(response.gig.payment_amount, response.gig.payment_currency)}
                              </span>
                            </div>
                          )}
                        </div>
                        {response.message && (
                          <p className="text-sm text-secondary mb-2">"{response.message}"</p>
                        )}
                        <p className="text-xs text-secondary">
                          Confirmed on {formatDate(response.confirmed_at || response.responded_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/e/${response.gig.event.slug}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Event
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                {getStatusIcon("interested")}
                Pending ({pending.length})
              </h2>
              <div className="grid gap-4">
                {pending.map((response) => (
                  <Card key={response.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-semibold text-primary">{response.gig.title}</h3>
                          {getStatusBadge(response.status)}
                          {response.dj_profile && (
                            <Badge variant="outline" className="text-xs">
                              {response.dj_profile.name}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-secondary mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {response.gig.event.name} • {formatDate(response.gig.event.start_time)}
                            </span>
                          </div>
                          {response.gig.event.venues && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {response.gig.event.venues.name}
                                {response.gig.event.venues.city && `, ${response.gig.event.venues.city}`}
                              </span>
                            </div>
                          )}
                          {response.gig.show_payment && response.gig.payment_amount && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium text-primary">
                                {formatCurrency(response.gig.payment_amount, response.gig.payment_currency)}
                              </span>
                            </div>
                          )}
                        </div>
                        {response.message && (
                          <p className="text-sm text-secondary mb-2">"{response.message}"</p>
                        )}
                        <p className="text-xs text-secondary">
                          Applied on {formatDate(response.responded_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/app/dj/gigs/${response.gig.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {declined.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                {getStatusIcon("declined")}
                Declined ({declined.length})
              </h2>
              <div className="grid gap-4">
                {declined.map((response) => (
                  <Card key={response.id} className="p-6 opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-semibold text-primary">{response.gig.title}</h3>
                          {getStatusBadge(response.status)}
                          {response.dj_profile && (
                            <Badge variant="outline" className="text-xs">
                              {response.dj_profile.name}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-secondary">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {response.gig.event.name} • {formatDate(response.gig.event.start_time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

