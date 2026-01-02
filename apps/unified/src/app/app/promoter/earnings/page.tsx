"use client";

import { useState, useEffect } from "react";
import { Card, Badge, LoadingSpinner } from "@crowdstack/ui";
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

export default function PromoterEarningsPage() {
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
      const response = await fetch("/api/promoter/earnings");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setSummary(data.summary || { confirmed: 0, pending: 0, estimated: 0, total: 0, by_currency: {} });
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
          <Badge color="green" variant="solid" size="sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge color="amber" variant="solid" size="sm">
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Payment
          </Badge>
        );
      case "estimated":
        return (
          <Badge color="blue" variant="ghost" size="sm">
            <TrendingUp className="h-3 w-3 mr-1" />
            Estimated
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "paid") return event.payment_status === "paid" || event.payment_status === "confirmed";
    if (filter === "pending") return event.payment_status === "pending_payment";
    if (filter === "estimated") return event.payment_status === "estimated";
    return true;
  });

  // Get primary currency (most used or USD)
  const primaryCurrency = Object.keys(summary.by_currency).length > 0 
    ? Object.keys(summary.by_currency)[0] 
    : "USD";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Earnings</h1>
        <p className="text-secondary mt-1">Track your commission payments across all events</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary font-medium mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-primary font-mono">
                {formatCurrency(summary.total, primaryCurrency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-accent-primary" />
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary font-medium mb-1">Paid</p>
              <p className="text-2xl font-bold text-accent-success font-mono">
                {formatCurrency(summary.confirmed, primaryCurrency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-accent-success" />
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary font-medium mb-1">Pending</p>
              <p className="text-2xl font-bold text-accent-warning font-mono">
                {formatCurrency(summary.pending, primaryCurrency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-accent-warning" />
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary font-medium mb-1">Estimated</p>
              <p className="text-2xl font-bold text-blue-400 font-mono">
                {formatCurrency(summary.estimated, primaryCurrency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Multi-currency breakdown if applicable */}
      {Object.keys(summary.by_currency).length > 1 && (
        <Card className="!p-4">
          <h3 className="text-sm font-bold text-primary mb-3">Earnings by Currency</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.by_currency).map(([currency, amounts]) => (
              <div key={currency} className="p-3 bg-raised rounded-lg">
                <p className="text-xs text-secondary mb-1">{currency}</p>
                <p className="text-lg font-bold font-mono text-primary">
                  {formatCurrency(amounts.total, currency)}
                </p>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span className="text-accent-success">✓ {formatCurrency(amounts.confirmed, currency)}</span>
                  <span className="text-accent-warning">⏳ {formatCurrency(amounts.pending, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border-subtle pb-2">
        {[
          { key: "all", label: "All Events", count: events.length },
          { key: "paid", label: "Paid", count: events.filter(e => e.payment_status === "paid" || e.payment_status === "confirmed").length },
          { key: "pending", label: "Pending", count: events.filter(e => e.payment_status === "pending_payment").length },
          { key: "estimated", label: "Active", count: events.filter(e => e.payment_status === "estimated").length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.key
                ? "bg-accent-primary text-white"
                : "text-secondary hover:text-primary hover:bg-raised"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card className="!p-8 text-center !border-dashed">
            <DollarSign className="h-12 w-12 text-muted mx-auto mb-3" />
            <h3 className="font-bold text-primary mb-1">No earnings yet</h3>
            <p className="text-secondary text-sm">
              {filter === "all" 
                ? "Start promoting events to earn commissions"
                : `No ${filter} payments to show`
              }
            </p>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.event_id} className="!p-4 hover:border-accent-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link 
                      href={`/app/promoter/events/${event.event_id}`}
                      className="font-bold text-primary hover:text-accent-primary transition-colors truncate"
                    >
                      {event.event_name}
                    </Link>
                    {getStatusBadge(event.payment_status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.event_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.checkins_count} check-ins
                    </span>
                    {event.paid_at && (
                      <span className="text-accent-success">
                        Paid {formatDate(event.paid_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className={`text-xl font-bold font-mono ${
                    event.payment_status === "paid" || event.payment_status === "confirmed"
                      ? "text-accent-success"
                      : event.payment_status === "pending_payment"
                      ? "text-accent-warning"
                      : "text-blue-400"
                  }`}>
                    {formatCurrency(event.commission_amount, event.currency)}
                  </p>
                  <p className="text-xs text-secondary">{event.currency}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {event.payment_proof_url && (
                    <a
                      href={event.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-raised hover:bg-active transition-colors"
                      title="View payment proof"
                    >
                      <FileText className="h-4 w-4 text-secondary" />
                    </a>
                  )}
                  <Link
                    href={`/app/promoter/events/${event.event_id}`}
                    className="p-2 rounded-lg bg-raised hover:bg-active transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-secondary" />
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Help Text */}
      <Card className="!p-4 !bg-blue-500/5 !border-blue-500/20">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h4 className="font-bold text-primary text-sm mb-1">Understanding Your Earnings</h4>
            <ul className="text-xs text-secondary space-y-1">
              <li><span className="text-accent-success font-medium">Paid</span> — Organizer has marked this as paid and may have uploaded proof</li>
              <li><span className="text-accent-warning font-medium">Pending</span> — Event closed, awaiting payment from organizer</li>
              <li><span className="text-blue-400 font-medium">Estimated</span> — Event still active, amount based on current check-ins</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
