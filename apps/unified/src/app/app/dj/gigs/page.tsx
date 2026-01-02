"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@crowdstack/ui";
import { Calendar, DollarSign, MapPin, Eye, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Gig {
  id: string;
  title: string;
  description: string | null;
  payment_amount: number | null;
  payment_currency: string;
  show_payment: boolean;
  posting_type: string;
  created_at: string;
  deadline: string | null;
  type: "open" | "invitation";
  invitation: {
    id: string;
    invited_at: string;
    viewed_at: string | null;
    invited_dj_id?: string;
  } | null;
  response_status: string | null;
  can_respond_as?: string;
  events: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    flier_url: string | null;
    status: string;
    venues: {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
    } | null;
  };
  organizers: {
    id: string;
    name: string;
  };
}

export default function DJGigsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState<Gig[]>([]);

  useEffect(() => {
    loadGigs();
  }, []);

  const loadGigs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dj/gigs");
      if (!response.ok) throw new Error("Failed to load gigs");
      const data = await response.json();
      setGigs(data.gigs || []);
    } catch (error) {
      console.error("Error loading gigs:", error);
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

  const getResponseBadge = (status: string | null) => {
    if (!status) return null;
    if (status === "interested") {
      return <Badge variant="success">Interested</Badge>;
    }
    if (status === "declined") {
      return <Badge variant="danger">Declined</Badge>;
    }
    if (status === "confirmed") {
      return <Badge variant="success">Confirmed</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading gigs...</div>
      </div>
    );
  }

  const invitations = gigs.filter((g) => g.type === "invitation");
  const openGigs = gigs.filter((g) => g.type === "open");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Available Gigs</h1>
        <p className="text-sm text-secondary">Browse and apply to gig postings</p>
      </div>

      {gigs.length === 0 ? (
        <Card padding="default" className="!p-8 text-center border-dashed">
          <h3 className="text-lg font-semibold text-primary mb-2">No gigs available</h3>
          <p className="text-sm text-secondary">
            Check back later for new gig postings or wait for invitations
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {invitations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-3">
                Invitations ({invitations.length})
              </h2>
              <div className="grid gap-3">
                {invitations.map((gig) => (
                  <Card key={gig.id} padding="compact" hover>
                    <div className="flex items-start gap-3">
                      {gig.events?.flier_url && (
                        <div className="flex-shrink-0 w-16 sm:w-20 aspect-[9/16] rounded-lg overflow-hidden border border-border-subtle bg-glass">
                          <Image
                            src={gig.events.flier_url}
                            alt={gig.events.name}
                            width={80}
                            height={142}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-base font-semibold text-primary">{gig.title}</h3>
                          <Badge variant="default" size="sm">Invitation</Badge>
                          {getResponseBadge(gig.response_status)}
                        </div>

                        <div className="space-y-1.5 text-sm text-secondary mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {gig.events?.name} • {formatDate(gig.events?.start_time || gig.created_at)}
                            </span>
                          </div>
                          {gig.events?.venues && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {gig.events.venues.name}
                                {gig.events.venues.city && `, ${gig.events.venues.city}`}
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
                          <div className="text-xs text-muted">
                            Invited {formatDate(gig.invitation?.invited_at || gig.created_at)}
                          </div>
                        </div>

                        {gig.description && (
                          <p className="text-sm text-secondary line-clamp-2">
                            {gig.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Link href={`/app/dj/gigs/${gig.id}`}>
                          <Button variant="secondary" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            {gig.response_status ? "View" : "Respond"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {openGigs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-3">
                Open Gigs ({openGigs.length})
              </h2>
              <div className="grid gap-3">
                {openGigs.map((gig) => (
                  <Card key={gig.id} padding="compact" hover>
                    <div className="flex items-start gap-3">
                      {gig.events?.flier_url && (
                        <div className="flex-shrink-0 w-16 sm:w-20 aspect-[9/16] rounded-lg overflow-hidden border border-border-subtle bg-glass">
                          <Image
                            src={gig.events.flier_url}
                            alt={gig.events.name}
                            width={80}
                            height={142}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-base font-semibold text-primary">{gig.title}</h3>
                          <Badge variant="default" size="sm">Open</Badge>
                          {getResponseBadge(gig.response_status)}
                        </div>

                        <div className="space-y-1.5 text-sm text-secondary mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {gig.events?.name} • {formatDate(gig.events?.start_time || gig.created_at)}
                            </span>
                          </div>
                          {gig.events?.venues && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {gig.events.venues.name}
                                {gig.events.venues.city && `, ${gig.events.venues.city}`}
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

                        {gig.description && (
                          <p className="text-sm text-secondary line-clamp-2">
                            {gig.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Link href={`/app/dj/gigs/${gig.id}`}>
                          <Button variant="secondary" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            {gig.response_status ? "View" : "Apply"}
                          </Button>
                        </Link>
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

