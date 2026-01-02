"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@crowdstack/ui";
import { Plus, Calendar, DollarSign, Users, Eye, AlertCircle, CheckCircle2, Clock, Filter } from "lucide-react";
import Link from "next/link";

interface GigPosting {
  id: string;
  title: string;
  status: string;
  posting_type: string;
  payment_amount: number | null;
  payment_currency: string;
  show_payment: boolean;
  created_at: string;
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
  response_counts: {
    interested: number;
    declined: number;
    confirmed: number;
    total: number;
  };
}

type FilterType = "all" | "active" | "needs_attention" | "confirmed" | "filled";

export default function OrganizerGigsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState<GigPosting[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    loadGigs();
  }, []);

  const loadGigs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/organizer/gigs");
      if (!response.ok) throw new Error("Failed to load gigs");
      const data = await response.json();
      setGigs(data.gigs || []);
    } catch (error) {
      console.error("Error loading gigs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "danger"> = {
      draft: "default",
      active: "success",
      closed: "default",
      filled: "success",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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

  // Calculate summary statistics
  const stats = {
    total: gigs.length,
    active: gigs.filter((g) => g.status === "active").length,
    needsAttention: gigs.filter(
      (g) => g.status === "active" && g.response_counts.interested > 0 && g.response_counts.confirmed === 0
    ).length,
    confirmed: gigs.filter((g) => g.response_counts.confirmed > 0).length,
    filled: gigs.filter((g) => g.status === "filled").length,
  };

  // Filter gigs based on selected filter
  const filteredGigs = gigs.filter((gig) => {
    switch (filter) {
      case "active":
        return gig.status === "active";
      case "needs_attention":
        return gig.status === "active" && gig.response_counts.interested > 0 && gig.response_counts.confirmed === 0;
      case "confirmed":
        return gig.response_counts.confirmed > 0;
      case "filled":
        return gig.status === "filled";
      default:
        return true;
    }
  });

  // Sort: needs attention first, then by response count, then by date
  const sortedGigs = [...filteredGigs].sort((a, b) => {
    // Needs attention first
    const aNeedsAttention = a.status === "active" && a.response_counts.interested > 0 && a.response_counts.confirmed === 0;
    const bNeedsAttention = b.status === "active" && b.response_counts.interested > 0 && b.response_counts.confirmed === 0;
    if (aNeedsAttention && !bNeedsAttention) return -1;
    if (!aNeedsAttention && bNeedsAttention) return 1;
    
    // Then by total responses
    if (a.response_counts.total !== b.response_counts.total) {
      return b.response_counts.total - a.response_counts.total;
    }
    
    // Then by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading gigs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">DJ Gigs</h1>
          <p className="text-secondary">Post gigs and manage DJ bookings</p>
        </div>
        <Link href="/app/organizer/gigs/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Post New Gig
          </Button>
        </Link>
      </div>

      {/* Summary Statistics */}
      {gigs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Total Gigs</span>
              <Calendar className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Active</span>
              <Clock className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </Card>
          <Card className={`p-4 ${stats.needsAttention > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Need Attention</span>
              <AlertCircle className={`w-4 h-4 ${stats.needsAttention > 0 ? "text-warning" : "text-secondary"}`} />
            </div>
            <p className={`text-2xl font-bold ${stats.needsAttention > 0 ? "text-warning" : "text-primary"}`}>
              {stats.needsAttention}
            </p>
            {stats.needsAttention > 0 && (
              <p className="text-xs text-secondary mt-1">Gigs with responses</p>
            )}
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Confirmed</span>
              <CheckCircle2 className="w-4 h-4 text-accent-success" />
            </div>
            <p className="text-2xl font-bold text-accent-success">{stats.confirmed}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Filled</span>
              <CheckCircle2 className="w-4 h-4 text-accent-success" />
            </div>
            <p className="text-2xl font-bold text-accent-success">{stats.filled}</p>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      {gigs.length > 0 && (
        <div className="flex items-center gap-2 mb-6 border-b border-border-subtle">
          <Filter className="w-4 h-4 text-secondary mr-2" />
          {[
            { value: "all", label: "All", count: stats.total },
            { value: "active", label: "Active", count: stats.active },
            { value: "needs_attention", label: "Needs Attention", count: stats.needsAttention },
            { value: "confirmed", label: "Confirmed", count: stats.confirmed },
            { value: "filled", label: "Filled", count: stats.filled },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as FilterType)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === f.value
                  ? "border-accent-primary text-primary"
                  : "border-transparent text-secondary hover:text-primary"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <Badge variant="default" className="ml-2">
                  {f.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {gigs.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold text-primary mb-2">No gig postings yet</h3>
          <p className="text-secondary mb-6">
            Post your first gig to start booking DJs for your events
          </p>
          <Link href="/app/organizer/gigs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Post Your First Gig
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedGigs.map((gig) => {
            const needsAttention = gig.status === "active" && gig.response_counts.interested > 0 && gig.response_counts.confirmed === 0;
            
            return (
            <Card 
              key={gig.id} 
              className={`p-6 hover:border-accent-primary/50 transition-colors ${
                needsAttention ? "border-warning/50 bg-warning/5" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-primary">{gig.title}</h3>
                    {getStatusBadge(gig.status)}
                    {needsAttention && (
                      <Badge variant="warning" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Needs Review
                      </Badge>
                    )}
                    {gig.posting_type === "open" && (
                      <Badge variant="default">Open</Badge>
                    )}
                    {gig.posting_type === "invite_only" && (
                      <Badge variant="default">Invite Only</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {gig.events?.name} • {formatDate(gig.events?.start_time || gig.created_at)}
                      </span>
                    </div>
                    {gig.events?.venues && (
                      <div className="flex items-center gap-2">
                        <span>📍 {gig.events.venues.name}</span>
                      </div>
                    )}
                    {gig.show_payment && gig.payment_amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(gig.payment_amount, gig.payment_currency)}</span>
                      </div>
                    )}
                    {!gig.show_payment && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Price hidden</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        {gig.response_counts.interested > 0 && (
                          <span className={needsAttention ? "font-semibold text-warning" : ""}>
                            {gig.response_counts.interested} interested
                          </span>
                        )}
                        {gig.response_counts.interested > 0 && gig.response_counts.confirmed > 0 && " • "}
                        {gig.response_counts.confirmed > 0 && (
                          <span className="text-accent-success font-semibold">
                            {gig.response_counts.confirmed} confirmed
                          </span>
                        )}
                        {gig.response_counts.interested === 0 && gig.response_counts.confirmed === 0 && (
                          <span className="text-secondary">No responses yet</span>
                        )}
                      </span>
                    </div>
                    {needsAttention && (
                      <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm text-warning">
                        ⚠️ {gig.response_counts.interested} DJ{gig.response_counts.interested > 1 ? "s" : ""} waiting for your response
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/app/organizer/gigs/${gig.id}`}>
                    <Button variant={needsAttention ? "primary" : "outline"} size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {needsAttention ? "Review Responses" : "View"}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

