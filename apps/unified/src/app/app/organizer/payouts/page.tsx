"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, LoadingSpinner, Badge, EmptyState } from "@crowdstack/ui";
import { Download, CheckCircle2, Clock, DollarSign, FileText, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Modal } from "@crowdstack/ui";
import { Input } from "@crowdstack/ui";

interface Payout {
  id: string;
  payout_run_id: string;
  promoter_id: string;
  checkins_count: number;
  commission_amount: number;
  payment_status: string;
  payment_proof_path: string | null;
  payment_marked_by: string | null;
  payment_marked_at: string | null;
  payment_notes: string | null;
  created_at: string;
  promoter: {
    id: string;
    name: string;
    email: string | null;
  };
  payout_runs: {
    events: {
      id: string;
      name: string;
      currency: string;
      start_time: string;
      closed_at: string | null;
    };
  };
}

interface EventGroup {
  event_id: string;
  event_name: string;
  event_date: string;
  currency: string;
  closed_at: string | null;
  payouts: Payout[];
  total_amount: number;
}

export default function OrganizerPayoutsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventGroup[]>([]);
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadPayouts();
  }, [statusFilter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/organizer/payouts/pending?status=${statusFilter}`
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setTotalsByCurrency(data.totals_by_currency || {});
      }
    } catch (error) {
      console.error("Failed to load payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/organizer/payouts/export?status=${statusFilter}`
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to export payouts");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Failed to export payouts:", error);
      alert(error.message || "Failed to export payouts");
    } finally {
      setExporting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedPayout) return;

    setMarkingPaid(true);
    try {
      const formData = new FormData();
      if (proofFile) {
        formData.append("proof_file", proofFile);
      }
      if (paymentNotes) {
        formData.append("payment_notes", paymentNotes);
      }

      const response = await fetch(
        `/api/payouts/${selectedPayout.id}/mark-paid`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      if (response.ok) {
        setShowMarkPaidModal(false);
        setSelectedPayout(null);
        setProofFile(null);
        setPaymentNotes("");
        await loadPayouts();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to mark payout as paid");
      }
    } catch (error) {
      console.error("Failed to mark payout as paid:", error);
      alert("Failed to mark payout as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "confirmed":
        return <Badge variant="success">Confirmed</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading payouts..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Payouts</h1>
          <p className="text-sm text-secondary mt-1">
            Manage and track promoter payouts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-raised border border-border-subtle text-sm text-primary focus:outline-none focus:border-accent-primary/50"
          >
            <option value="all">All Status</option>
            <option value="pending_payment">Pending</option>
            <option value="paid">Paid</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <Button variant="secondary" onClick={handleExport} loading={exporting} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Totals by Currency */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(totalsByCurrency).map(([currency, amount]) => (
              <div key={currency}>
                <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                  Total ({currency})
                </div>
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(amount, currency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Events List - Compact Expandable */}
      {events.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-12 w-12" />}
          title="No Payouts Found"
          description={
            statusFilter === "all"
              ? "No payouts have been generated yet."
              : `No payouts with status "${statusFilter}" found.`
          }
        />
      ) : (
        <div className="space-y-2">
          {events.map((eventGroup) => {
            const isExpanded = expandedEvents.has(eventGroup.event_id);
            const pendingCount = eventGroup.payouts.filter(p => p.payment_status === "pending_payment").length;
            const paidCount = eventGroup.payouts.filter(p => p.payment_status === "paid" || p.payment_status === "confirmed").length;

            return (
              <Card key={eventGroup.event_id} className="overflow-hidden">
                {/* Compact Header Row - Always Visible */}
                <button
                  onClick={() => toggleEvent(eventGroup.event_id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-active/30 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary text-sm truncate">
                        {eventGroup.event_name}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(eventGroup.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      {pendingCount > 0 && (
                        <Badge variant="warning" className="!text-[10px] !px-1.5 !py-0.5">
                          {pendingCount} pending
                        </Badge>
                      )}
                      {paidCount > 0 && (
                        <Badge variant="success" className="!text-[10px] !px-1.5 !py-0.5">
                          {paidCount} paid
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-sm font-bold text-primary min-w-[80px] text-right">
                      {formatCurrency(eventGroup.total_amount, eventGroup.currency)}
                    </span>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border-subtle bg-active/20">
                    <div className="divide-y divide-border-subtle">
                      {eventGroup.payouts.map((payout) => (
                        <div
                          key={payout.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-active/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-primary truncate">
                                {payout.promoter.name}
                              </span>
                              {getStatusBadge(payout.payment_status)}
                            </div>
                            <div className="text-[11px] text-muted mt-0.5">
                              {payout.checkins_count} check-ins
                              {payout.payment_notes && ` • ${payout.payment_notes}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono text-sm font-semibold text-primary">
                              {formatCurrency(payout.commission_amount, eventGroup.currency)}
                            </span>
                            {payout.payment_status === "pending_payment" && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="!text-xs !px-2 !py-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayout(payout);
                                  setShowMarkPaidModal(true);
                                }}
                              >
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Event Actions Footer */}
                    <div className="flex items-center justify-end gap-2 px-4 py-2 bg-active/10 border-t border-border-subtle">
                      <Link href={`/app/organizer/events/${eventGroup.event_id}`}>
                        <Button variant="ghost" size="sm" className="!text-xs">
                          View Event
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Mark Paid Modal */}
      <Modal
        isOpen={showMarkPaidModal}
        onClose={() => {
          setShowMarkPaidModal(false);
          setSelectedPayout(null);
          setProofFile(null);
          setPaymentNotes("");
        }}
        title="Mark Payout as Paid"
        size="md"
      >
        <div className="space-y-4">
          {selectedPayout && (
            <div className="p-4 rounded-lg bg-active/50 border border-border-subtle">
              <div className="text-sm font-medium text-primary">
                {selectedPayout.promoter.name}
              </div>
              <div className="text-lg font-bold text-primary mt-1">
                {formatCurrency(
                  selectedPayout.commission_amount,
                  selectedPayout.payout_runs.events.currency
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Payment Proof (Optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setProofFile(e.target.files?.[0] || null)
              }
              className="w-full px-4 py-2 rounded-xl bg-raised border border-border-subtle text-sm text-primary"
            />
            <p className="mt-1.5 text-xs text-secondary">
              Upload screenshot, receipt, or bank confirmation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Payment Notes (Optional)
            </label>
            <textarea
              className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary placeholder:text-muted min-h-[100px]"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Payment method, reference number, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowMarkPaidModal(false);
                setSelectedPayout(null);
                setProofFile(null);
                setPaymentNotes("");
              }}
              disabled={markingPaid}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleMarkPaid}
              loading={markingPaid}
            >
              Mark as Paid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
