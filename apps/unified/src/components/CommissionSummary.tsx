"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge, LoadingSpinner } from "@crowdstack/ui";
import {
  DollarSign,
  Download,
  Users,
  TrendingUp,
  Lock,
  RefreshCw,
} from "lucide-react";

interface CommissionSummaryProps {
  eventId: string;
  compact?: boolean;
}

interface CommissionData {
  event: {
    id: string;
    name: string;
    is_locked: boolean;
    locked_at: string | null;
  };
  currency: string;
  summary: {
    total_commissions: number;
    total_spend: number;
    total_promoter_commission: number;
    total_venue_commission: number;
  };
  commissions: Array<{
    id: string;
    booking_id: string;
    spend_amount: number;
    spend_source: string;
    promoter_commission_rate: number | null;
    promoter_commission_amount: number;
    venue_commission_rate: number;
    venue_commission_amount: number;
    locked: boolean;
    booking: {
      guest_name: string;
      guest_email: string;
      status: string;
      table_name: string | null;
    } | null;
    promoter: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>;
}

interface PromoterBreakdown {
  id: string;
  name: string;
  booking_count: number;
  total_spend: number;
  total_commission: number;
  average_rate: number;
}

export function CommissionSummary({ eventId, compact = false }: CommissionSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CommissionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadCommissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/venue/events/${eventId}/commissions`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load commissions");
      }

      setData(result);
    } catch (err: any) {
      console.error("Error loading commissions:", err);
      setError(err.message || "Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const handleExport = async () => {
    try {
      setExporting(true);

      const response = await fetch(`/api/venue/events/${eventId}/commissions/export`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export");
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch ? filenameMatch[1] : `commissions_${eventId}.csv`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting:", err);
      alert(err.message || "Failed to export commissions");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (!data) return `$${amount.toLocaleString()}`;
    const symbol = data.currency === "IDR" ? "Rp" : "$";
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Calculate promoter breakdown
  const getPromoterBreakdown = (): PromoterBreakdown[] => {
    if (!data) return [];

    const breakdown = new Map<string, PromoterBreakdown>();

    for (const commission of data.commissions) {
      if (commission.promoter) {
        const existing = breakdown.get(commission.promoter.id) || {
          id: commission.promoter.id,
          name: commission.promoter.name,
          booking_count: 0,
          total_spend: 0,
          total_commission: 0,
          average_rate: 0,
        };

        existing.booking_count++;
        existing.total_spend += commission.spend_amount || 0;
        existing.total_commission += commission.promoter_commission_amount || 0;

        breakdown.set(commission.promoter.id, existing);
      }
    }

    // Calculate average rates
    for (const [id, promoter] of breakdown) {
      if (promoter.total_spend > 0) {
        promoter.average_rate = Math.round(
          (promoter.total_commission / promoter.total_spend) * 100 * 100
        ) / 100;
      }
    }

    return Array.from(breakdown.values()).sort(
      (a, b) => b.total_commission - a.total_commission
    );
  };

  if (loading) {
    return (
      <Card className={compact ? "p-4" : "p-6"}>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={compact ? "p-4" : "p-6"}>
        <div className="text-center text-secondary">
          {error || "Failed to load commission data"}
        </div>
      </Card>
    );
  }

  const promoterBreakdown = getPromoterBreakdown();

  if (compact) {
    // Compact view for embedding in other components
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-primary flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Commission Summary
          </h4>
          {data.event.is_locked && (
            <Badge variant="success" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xs text-muted">Total Spend</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(data.summary.total_spend)}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xs text-muted">Promoter</p>
            <p className="text-lg font-bold text-accent-primary">
              {formatCurrency(data.summary.total_promoter_commission)}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xs text-muted">Venue</p>
            <p className="text-lg font-bold text-accent-success">
              {formatCurrency(data.summary.total_venue_commission)}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={exporting || data.summary.total_commissions === 0}
          className="w-full"
        >
          {exporting ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export CSV
        </Button>
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-success/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Commission Summary</h3>
              <p className="text-sm text-secondary">
                {data.event.name}
                {data.event.is_locked && (
                  <span className="ml-2 text-accent-success">
                    (Locked {new Date(data.event.locked_at!).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadCommissions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={exporting || data.summary.total_commissions === 0}
            >
              {exporting ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Bookings</p>
            <p className="text-2xl font-bold text-primary">
              {data.summary.total_commissions}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Total Spend</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(data.summary.total_spend)}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Promoter Commission</p>
            <p className="text-2xl font-bold text-accent-primary">
              {formatCurrency(data.summary.total_promoter_commission)}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Venue Commission</p>
            <p className="text-2xl font-bold text-accent-success">
              {formatCurrency(data.summary.total_venue_commission)}
            </p>
          </div>
        </div>
      </Card>

      {/* Promoter Breakdown */}
      {promoterBreakdown.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold text-primary mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Commission by Promoter
          </h4>
          <div className="space-y-3">
            {promoterBreakdown.map((promoter) => (
              <div
                key={promoter.id}
                className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-primary">{promoter.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted mt-1">
                    <span>{promoter.booking_count} booking{promoter.booking_count !== 1 ? "s" : ""}</span>
                    <span>{formatCurrency(promoter.total_spend)} spend</span>
                    <span>{promoter.average_rate}% rate</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-lg">
                    {formatCurrency(promoter.total_commission)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Commission Details Table */}
      {data.commissions.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <h4 className="font-semibold text-primary">Commission Details</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary">
                  <th className="text-left p-3 font-medium text-secondary">Table</th>
                  <th className="text-left p-3 font-medium text-secondary">Guest</th>
                  <th className="text-left p-3 font-medium text-secondary">Promoter</th>
                  <th className="text-right p-3 font-medium text-secondary">Spend</th>
                  <th className="text-right p-3 font-medium text-secondary">Promoter %</th>
                  <th className="text-right p-3 font-medium text-secondary">Promoter</th>
                  <th className="text-right p-3 font-medium text-secondary">Venue</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((commission) => (
                  <tr key={commission.id} className="border-t border-border-subtle">
                    <td className="p-3 text-primary">
                      {commission.booking?.table_name || "-"}
                    </td>
                    <td className="p-3 text-secondary">
                      {commission.booking?.guest_name || "-"}
                    </td>
                    <td className="p-3 text-secondary">
                      {commission.promoter?.name || "-"}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {formatCurrency(commission.spend_amount)}
                      <span className="text-xs text-muted ml-1">
                        ({commission.spend_source})
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted">
                      {commission.promoter_commission_rate !== null
                        ? `${commission.promoter_commission_rate}%`
                        : "-"
                      }
                    </td>
                    <td className="p-3 text-right text-accent-primary">
                      {commission.promoter_commission_amount > 0
                        ? formatCurrency(commission.promoter_commission_amount)
                        : "-"
                      }
                    </td>
                    <td className="p-3 text-right text-accent-success">
                      {formatCurrency(commission.venue_commission_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-secondary font-semibold">
                  <td colSpan={3} className="p-3 text-primary">Total</td>
                  <td className="p-3 text-right text-primary">
                    {formatCurrency(data.summary.total_spend)}
                  </td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right text-accent-primary">
                    {formatCurrency(data.summary.total_promoter_commission)}
                  </td>
                  <td className="p-3 text-right text-accent-success">
                    {formatCurrency(data.summary.total_venue_commission)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
