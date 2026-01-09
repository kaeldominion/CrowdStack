"use client";

import { useState } from "react";
import { Card, Button, Input } from "@crowdstack/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CloseoutSummary, PayoutBreakdown } from "@crowdstack/shared/types";

interface PayoutReviewStepProps {
  summary: CloseoutSummary;
  onNext: () => void;
  onBack: () => void;
  onAdjustmentUpdate: (
    promoterId: string,
    adjustmentAmount: number | null,
    adjustmentReason: string | null
  ) => Promise<void>;
  onReload: () => Promise<void>;
}

export function PayoutReviewStep({
  summary,
  onNext,
  onBack,
  onAdjustmentUpdate,
  onReload,
}: PayoutReviewStepProps) {
  const [editingPromoter, setEditingPromoter] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [expandedPromoters, setExpandedPromoters] = useState<Set<string>>(new Set());

  const toggleBreakdown = (promoterId: string) => {
    setExpandedPromoters((prev) => {
      const next = new Set(prev);
      if (next.has(promoterId)) {
        next.delete(promoterId);
      } else {
        next.add(promoterId);
      }
      return next;
    });
  };

  const handleEdit = (promoter: (typeof summary.promoters)[0]) => {
    setEditingPromoter(promoter.promoter_id);
    setAdjustmentAmount(
      promoter.manual_adjustment_amount?.toString() || ""
    );
    setAdjustmentReason(promoter.manual_adjustment_reason || "");
  };

  const handleSave = async (promoterId: string) => {
    setSaving(true);
    try {
      const amount =
        adjustmentAmount.trim() === ""
          ? null
          : parseFloat(adjustmentAmount);
      const reason = adjustmentReason.trim() || null;

      await onAdjustmentUpdate(promoterId, amount, reason);
      setEditingPromoter(null);
      setAdjustmentAmount("");
      setAdjustmentReason("");
      await onReload();
    } catch (err) {
      console.error("Failed to save adjustment:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPromoter(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderBreakdown = (breakdown: PayoutBreakdown) => {
    const lines: Array<{ label: string; amount: number; detail?: string }> = [];

    // Per-head earnings
    if (breakdown.per_head_amount > 0) {
      lines.push({
        label: "Per-head earnings",
        amount: breakdown.per_head_amount,
        detail: `${breakdown.per_head_counted} × ${formatCurrency(breakdown.per_head_rate || 0)}`,
      });
    } else if (breakdown.per_head_rate && breakdown.per_head_counted === 0) {
      lines.push({
        label: "Per-head earnings",
        amount: 0,
        detail: "Below minimum threshold",
      });
    }

    // Fixed fee
    if (breakdown.fixed_fee_amount > 0) {
      if (
        breakdown.fixed_fee_percent_applied !== null &&
        breakdown.fixed_fee_percent_applied < 100
      ) {
        lines.push({
          label: "Fixed fee",
          amount: breakdown.fixed_fee_amount,
          detail: `${breakdown.fixed_fee_percent_applied}% of ${formatCurrency(breakdown.fixed_fee_full || 0)} (below minimum guests)`,
        });
      } else {
        lines.push({
          label: "Fixed fee",
          amount: breakdown.fixed_fee_amount,
        });
      }
    } else if (
      breakdown.fixed_fee_full &&
      breakdown.fixed_fee_percent_applied !== null &&
      breakdown.fixed_fee_percent_applied < 100
    ) {
      lines.push({
        label: "Fixed fee",
        amount: breakdown.fixed_fee_amount,
        detail: `${breakdown.fixed_fee_percent_applied}% of ${formatCurrency(breakdown.fixed_fee_full)} (below minimum guests)`,
      });
    }

    // Bonuses
    for (const bonus of breakdown.bonus_details) {
      if (bonus.type === "repeatable" && bonus.times_earned) {
        lines.push({
          label: bonus.label || `Repeatable bonus`,
          amount: bonus.amount * bonus.times_earned,
          detail: `${formatCurrency(bonus.amount)} × ${bonus.times_earned} (every ${bonus.threshold} guests)`,
        });
      } else {
        lines.push({
          label: bonus.label || `Bonus (${bonus.threshold}+ guests)`,
          amount: bonus.amount,
        });
      }
    }

    return lines;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          Review Payouts
        </h3>
        <p className="text-sm text-secondary">
          Review calculated payouts for each promoter. Click to expand and see the
          calculation breakdown. You can add manual adjustments if needed.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border-subtle">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Total Payout
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(summary.total_payout)}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Currency
              </div>
              <div className="text-2xl font-bold text-primary">
                {summary.currency}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary">
              Payout Details
            </div>
            {summary.promoters.map((promoter) => {
              const isExpanded = expandedPromoters.has(promoter.promoter_id);
              const breakdownLines = promoter.payout_breakdown
                ? renderBreakdown(promoter.payout_breakdown)
                : [];

              return (
                <div
                  key={promoter.promoter_id}
                  className="p-4 rounded-lg bg-active/50 border border-border-subtle space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-primary">
                        {promoter.promoter_name}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        {promoter.checkins_count} check-ins
                        {promoter.manual_checkins_override !== null && (
                          <span className="text-accent-warning ml-1">
                            (overridden from {promoter.actual_checkins_count})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(promoter.final_payout)}
                        </div>
                        {promoter.manual_adjustment_amount !== null &&
                          promoter.manual_adjustment_amount !== 0 && (
                            <div className="text-xs text-accent-warning mt-1">
                              {promoter.manual_adjustment_amount > 0 ? "+" : ""}
                              {formatCurrency(promoter.manual_adjustment_amount)} adjustment
                            </div>
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBreakdown(promoter.promoter_id)}
                        className="p-1 rounded hover:bg-active transition-colors"
                        title={isExpanded ? "Hide breakdown" : "Show breakdown"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-secondary" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-secondary" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Calculation Breakdown */}
                  {isExpanded && breakdownLines.length > 0 && (
                    <div className="pt-3 border-t border-border-subtle">
                      <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-2">
                        Calculation Breakdown
                      </div>
                      <div className="space-y-1.5">
                        {breakdownLines.map((line, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="text-primary">{line.label}</span>
                              {line.detail && (
                                <span className="text-secondary ml-2 text-xs">
                                  ({line.detail})
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-primary">
                              {formatCurrency(line.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border-subtle font-semibold">
                          <span className="text-primary">Subtotal</span>
                          <span className="text-primary">
                            {formatCurrency(promoter.calculated_payout)}
                          </span>
                        </div>
                        {promoter.manual_adjustment_amount !== null &&
                          promoter.manual_adjustment_amount !== 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-accent-warning">Manual Adjustment</span>
                                {promoter.manual_adjustment_reason && (
                                  <span className="text-secondary ml-2 text-xs">
                                    ({promoter.manual_adjustment_reason})
                                  </span>
                                )}
                              </div>
                              <span className="font-medium text-accent-warning">
                                {promoter.manual_adjustment_amount > 0 ? "+" : ""}
                                {formatCurrency(promoter.manual_adjustment_amount)}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Empty breakdown fallback */}
                  {isExpanded && breakdownLines.length === 0 && (
                    <div className="pt-3 border-t border-border-subtle">
                      <div className="text-xs text-secondary">
                        No detailed breakdown available
                      </div>
                    </div>
                  )}

                  {/* Edit Adjustment Form */}
                  {editingPromoter === promoter.promoter_id ? (
                    <div className="pt-3 border-t border-border-subtle space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Adjustment Amount"
                          type="number"
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(e.target.value)}
                          placeholder="0"
                          helperText="Positive or negative amount"
                        />
                        <div className="flex items-end pb-6">
                          <div className="text-xs text-secondary">
                            Calculated: {formatCurrency(promoter.calculated_payout)}
                          </div>
                        </div>
                      </div>
                      <Input
                        label="Adjustment Reason"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        placeholder="Reason for adjustment (required)"
                        helperText="Required for audit trail"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleSave(promoter.promoter_id)}
                          loading={saving}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-border-subtle">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-secondary">
                          {promoter.manual_adjustment_reason
                            ? `Adjustment: ${promoter.manual_adjustment_reason}`
                            : "No manual adjustment"}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(promoter)}
                        >
                          {promoter.manual_adjustment_amount !== null &&
                          promoter.manual_adjustment_amount !== 0
                            ? "Edit Adjustment"
                            : "Add Adjustment"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="primary" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
