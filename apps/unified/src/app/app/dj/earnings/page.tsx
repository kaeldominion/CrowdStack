"use client";

import { useState, useEffect } from "react";
import { Card, Badge, LoadingSpinner, Button } from "@crowdstack/ui";
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Calendar,
  Users,
  FileText,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// DJ gig earnings interface
interface EventEarnings {
  event_id: string;
  event_name: string;
  event_date: string;
  event_status: "active" | "closed";
  currency: string;
  checkins_count: number;
  registrations_count: number;
  commission_amount: number;
  payment_status: "estimated" | "pending_payment" | "paid" | "confirmed";
  payment_proof_url: string | null;
  paid_at: string | null;
  payout_line_id: string | null;
  gig_title?: string;
  gig_posting_id?: string;
  event_slug?: string;
}

interface EarningsSummary {
  confirmed: number;
  pending: number;
  estimated: number;
  total: number;
  by_currency: Record<string, {
    confirmed: number;
    pending: number;
    estimated: number;
    total: number;
  }>;
}

export default function DJEarningsPage() {
  const [events, setEvents] = useState<EventEarnings[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    confirmed: 0,
    pending: 0,
    estimated: 0,
    total: 0,
    by_currency: {},
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "estimated">("all");

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      // Use separate DJ gig earnings API (not promoter earnings)
      const response = await fetch("/api/dj/earnings");
      if (response.ok) {
        const data = await response.json();
        // Transform DJ gig earnings to match the expected format
        const transformedEvents = (data.earnings || []).map((earning: any) => ({
          event_id: earning.event_id,
          event_name: earning.event_name,
          event_date: earning.event_date,
          event_status: earning.event_status,
          currency: earning.payment_currency || "USD",
          checkins_count: 0, // Not applicable for DJ gigs
          registrations_count: 0, // Not applicable for DJ gigs
          commission_amount: earning.payment_amount || 0,
          payment_status: earning.payment_status,
          payment_proof_url: null,
          paid_at: null,
          payout_line_id: null,
          gig_title: earning.gig_title,
          gig_posting_id: earning.gig_posting_id,
          event_slug: earning.event_slug,
        }));
        setEvents(transformedEvents);
        setSummary({
          confirmed: data.summary?.confirmed || 0,
          pending: data.summary?.pending || 0,
          estimated: 0, // Not applicable for DJ gigs
          total: data.summary?.total || 0,
          by_currency: data.summary?.by_currency || {},
        });
      }
    } catch (error) {
      console.error("Failed to load earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: EventEarnings["payment_status"]) => {
    switch (status) {
      case "confirmed":
      case "paid":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "estimated":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Estimated
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "paid") return event.payment_status === "paid" || event.payment_status === "confirmed";
    if (filter === "pending") return event.payment_status === "pending_payment";
    if (filter === "estimated") return event.payment_status === "estimated";
    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Earnings</h1>
        <p className="text-secondary">Track your gig earnings and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Total Earnings</span>
            <DollarSign className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(summary.total, "USD")}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Confirmed</span>
            <CheckCircle2 className="w-5 h-5 text-accent-success" />
          </div>
          <div className="text-2xl font-bold text-accent-success">
            {formatCurrency(summary.confirmed, "USD")}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Pending</span>
            <Clock className="w-5 h-5 text-accent-warning" />
          </div>
          <div className="text-2xl font-bold text-accent-warning">
            {formatCurrency(summary.pending, "USD")}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Estimated</span>
            <TrendingUp className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-2xl font-bold text-secondary">
            {formatCurrency(summary.estimated, "USD")}
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border-subtle">
        {(["all", "paid", "pending", "estimated"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-accent-primary text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-secondary">No earnings found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card key={event.event_id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-primary">{event.event_name}</h3>
                      {event.gig_title && (
                        <p className="text-sm text-secondary mt-1">Gig: {event.gig_title}</p>
                      )}
                    </div>
                    {getStatusBadge(event.payment_status)}
                  </div>
                  <div className="space-y-2 text-sm text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-primary text-lg">
                        {formatCurrency(event.commission_amount, event.currency)}
                      </span>
                    </div>
                    {event.payment_proof_url && (
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="w-4 h-4" />
                        <a
                          href={event.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-primary hover:underline flex items-center gap-1"
                        >
                          View Payment Proof
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {event.paid_at && (
                      <p className="text-xs text-secondary mt-2">
                        Paid on {formatDate(event.paid_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/e/${event.event_slug || event.event_id}`}>
                    <Button variant="secondary" size="sm">
                      View Event
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  {event.gig_posting_id && (
                    <Link href={`/app/dj/gigs/${event.gig_posting_id}`}>
                      <Button variant="secondary" size="sm">
                        View Gig
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

